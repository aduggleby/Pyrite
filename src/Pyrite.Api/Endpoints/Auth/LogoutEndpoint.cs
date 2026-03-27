using FastEndpoints;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Pyrite.Api.Services;

namespace Pyrite.Api.Endpoints.Auth;

public sealed class LogoutEndpoint(
    RequestSecurityService requestSecurityService,
    ILogger<LogoutEndpoint> logger) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Post("/auth/logout");
    }

    public override async Task HandleAsync(CancellationToken cancellationToken)
    {
        if (!await requestSecurityService.EnsureUnsafeRequestIsValidAsync(HttpContext))
        {
            logger.LogWarning(
                "Logout rejected due to invalid antiforgery token: username={Username}, hasAuthCookie={HasAuthCookie}, hasCsrfCookie={HasCsrfCookie}",
                User.Identity?.Name ?? "<anonymous>",
                HttpContext.Request.Cookies.ContainsKey("pyrite-auth"),
                HttpContext.Request.Cookies.ContainsKey("pyrite-csrf"));
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { error = "A valid antiforgery token is required." }, cancellationToken);
            return;
        }

        logger.LogInformation(
            "Logout requested: username={Username}, authenticated={IsAuthenticated}, hasAuthCookie={HasAuthCookie}, hasCsrfCookie={HasCsrfCookie}",
            User.Identity?.Name ?? "<anonymous>",
            User.Identity?.IsAuthenticated == true,
            HttpContext.Request.Cookies.ContainsKey("pyrite-auth"),
            HttpContext.Request.Cookies.ContainsKey("pyrite-csrf"));

        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

        logger.LogInformation("Logout completed: username={Username}", User.Identity?.Name ?? "<anonymous>");
        await HttpContext.Response.SendNoContentAsync(cancellation: cancellationToken);
    }
}
