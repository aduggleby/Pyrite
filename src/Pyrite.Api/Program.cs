using System.Reflection;
using FastEndpoints;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Pyrite.Api.Configuration;
using Pyrite.Api.Services;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

var logsRoot = Environment.GetEnvironmentVariable("PYRITE_LOGS_DIR") ?? Path.Combine(builder.Environment.ContentRootPath, "logs");
var appLogsDirectory = Path.Combine(logsRoot, builder.Environment.IsDevelopment() ? "dev" : "prod");
Directory.CreateDirectory(appLogsDirectory);

builder.Host.UseSerilog((context, services, configuration) =>
{
    var filePath = context.HostingEnvironment.IsDevelopment()
        ? Path.Combine(appLogsDirectory, "pyrite-api.log")
        : Path.Combine(appLogsDirectory, "pyrite-api-.log");

    configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console()
        .WriteTo.File(
            path: filePath,
            rollingInterval: context.HostingEnvironment.IsDevelopment() ? RollingInterval.Infinite : RollingInterval.Day,
            retainedFileCountLimit: context.HostingEnvironment.IsDevelopment() ? 1 : 30,
            shared: true);
});

builder.Services
    .AddOptions<PyriteOptions>()
    .Bind(builder.Configuration.GetSection(PyriteOptions.SectionName))
    .ValidateDataAnnotations()
    .Validate(options => Directory.Exists(options.VaultRoot), "The configured vault root must exist.")
    .Validate(options => !string.IsNullOrWhiteSpace(options.Auth.Username), "A username must be configured.")
    .Validate(options => PasswordHashService.IsValidSha256(options.Auth.PasswordSha256), "Password hash must be a 64-character lowercase SHA-256 hex string.")
    .ValidateOnStart();

builder.Services.AddCors(options =>
{
    options.AddPolicy("DevClient", policy =>
    {
        policy
            .WithOrigins("http://localhost:18110", "https://localhost:18110")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor |
        ForwardedHeaders.XForwardedProto |
        ForwardedHeaders.XForwardedHost;

    // Pyrite is commonly deployed behind a user-managed reverse proxy.
    // Accept forwarded headers from that proxy without requiring a static allowlist.
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-PYRITE-CSRF";
    options.Cookie.Name = "pyrite-csrf";
    options.Cookie.HttpOnly = false;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("login", limiter =>
    {
        limiter.Window = TimeSpan.FromMinutes(5);
        limiter.PermitLimit = builder.Environment.IsDevelopment() ? 100 : 10;
        limiter.QueueLimit = 0;
    });
});

builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "pyrite-auth";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        options.ExpireTimeSpan = TimeSpan.FromDays(7);
        options.SlidingExpiration = true;
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });

builder.Services.AddAuthorizationBuilder();
builder.Services.AddFastEndpoints();

builder.Services.Configure<FormOptions>(options =>
{
    var uploadOptions = builder.Configuration.GetSection(PyriteOptions.SectionName).Get<PyriteOptions>()?.Uploads ?? new UploadOptions();
    options.MultipartBodyLengthLimit = uploadOptions.MaxBytes;
});

builder.Services.AddSingleton<PasswordHashService>();
builder.Services.AddSingleton<AuthSessionService>();
builder.Services.AddSingleton<PathSafetyService>();
builder.Services.AddSingleton<RequestSecurityService>();
builder.Services.AddSingleton<MarkdownService>();
builder.Services.AddSingleton<MergeService>();
builder.Services.AddSingleton<VaultService>();
builder.Services.AddSingleton<SearchService>();

var app = builder.Build();

var appVersion = Assembly
    .GetExecutingAssembly()
    .GetCustomAttribute<AssemblyInformationalVersionAttribute>()?
    .InformationalVersion
    .Split('+')[0]
    ?? Assembly.GetExecutingAssembly().GetName().Version?.ToString()
    ?? "unknown";

var startupLogger = app.Services.GetRequiredService<ILogger<Program>>();
var startupOptions = app.Services.GetRequiredService<Microsoft.Extensions.Options.IOptions<PyriteOptions>>().Value;

startupLogger.LogInformation(
    """

    ██████  ██    ██ ██████  ██ ████████ ███████ 
    ██   ██  ██  ██  ██   ██ ██    ██    ██      
    ██████    ████   ██████  ██    ██    █████   
    ██         ██    ██   ██ ██    ██    ██      
    ██         ██    ██   ██ ██    ██    ███████

    """);

startupLogger.LogInformation("Pyrite version {AppVersion}", appVersion);

startupLogger.LogInformation(
    "Pyrite starting: environment={Environment}, vaultRoot={VaultRoot}, authUsername={AuthUsername}, authUsernameDetails={AuthUsernameDetails}, authHashFingerprint={AuthHashFingerprint}, authHashDetails={AuthHashDetails}, logsDirectory={LogsDirectory}, authCookieName={AuthCookieName}, csrfCookieName={CsrfCookieName}, cookieSecurePolicy={CookieSecurePolicy}",
    app.Environment.EnvironmentName,
    startupOptions.VaultRoot,
    startupOptions.Auth.Username,
    PasswordHashService.DescribeValue(startupOptions.Auth.Username),
    PasswordHashService.ToHashFingerprint(startupOptions.Auth.PasswordSha256),
    PasswordHashService.DescribeValue(startupOptions.Auth.PasswordSha256),
    appLogsDirectory,
    "pyrite-auth",
    "pyrite-csrf",
    CookieSecurePolicy.SameAsRequest);

app.UseExceptionHandler(exceptionApp =>
{
    exceptionApp.Run(async context =>
    {
        var exception = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;

        context.Response.StatusCode = exception switch
        {
            FileNotFoundException => StatusCodes.Status404NotFound,
            DirectoryNotFoundException => StatusCodes.Status404NotFound,
            InvalidOperationException => StatusCodes.Status400BadRequest,
            _ => StatusCodes.Status500InternalServerError
        };

        await context.Response.WriteAsJsonAsync(new
        {
            error = exception?.Message ?? "Unexpected server error."
        });
    });
});

app.UseForwardedHeaders();

if (app.Environment.IsDevelopment())
{
    app.UseCors("DevClient");
}

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.UseFastEndpoints(config =>
{
    config.Endpoints.RoutePrefix = "api";
});

var webRoot = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
if (Directory.Exists(webRoot))
{
    app.UseDefaultFiles();
    app.UseStaticFiles();
    app.MapFallbackToFile("index.html");
}

app.Run();

public partial class Program;
