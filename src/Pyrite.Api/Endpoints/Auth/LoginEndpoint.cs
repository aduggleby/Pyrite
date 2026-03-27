using FastEndpoints;
using Microsoft.AspNetCore.Authentication;
using Pyrite.Api.Models;
using Pyrite.Api.Services;

namespace Pyrite.Api.Endpoints.Auth;

public sealed class LoginEndpoint(
    PasswordHashService passwordHashService,
    AuthSessionService authSessionService,
    ILogger<LoginEndpoint> logger) : Endpoint<LoginRequest, SessionResponse>
{
    public override void Configure()
    {
        Post("/auth/login");
        AllowAnonymous();
        Options(builder => builder.RequireRateLimiting("login"));
    }

    public override async Task HandleAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var diagnostics = passwordHashService.DiagnoseMatch(request.Username, request.Password);

        logger.LogInformation(
            "Login attempt: remoteIp={RemoteIp}, username={SuppliedUsername}, usernameDetails={SuppliedUsernameDetails}, passwordDetails={PasswordDetails}, configuredUsername={ConfiguredUsername}, configuredHashFingerprint={ConfiguredHashFingerprint}, suppliedHashFingerprint={SuppliedHashFingerprint}, usernameMatches={UsernameMatches}, passwordHashMatches={PasswordHashMatches}",
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "<unknown>",
            diagnostics.SuppliedUsername,
            PasswordHashService.DescribeValue(diagnostics.SuppliedUsername),
            PasswordHashService.DescribeValue(request.Password),
            diagnostics.ConfiguredUsername,
            PasswordHashService.ToHashFingerprint(diagnostics.ConfiguredPasswordHash),
            PasswordHashService.ToHashFingerprint(diagnostics.SuppliedPasswordHash),
            diagnostics.UsernameMatches,
            diagnostics.PasswordHashMatches);

        if (!diagnostics.IsMatch)
        {
            logger.LogWarning(
                "Login rejected: remoteIp={RemoteIp}, username={SuppliedUsername}, configuredUsername={ConfiguredUsername}, configuredHashDetails={ConfiguredHashDetails}, suppliedHashDetails={SuppliedHashDetails}",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "<unknown>",
                diagnostics.SuppliedUsername,
                diagnostics.ConfiguredUsername,
                PasswordHashService.DescribeValue(diagnostics.ConfiguredPasswordHash),
                PasswordHashService.DescribeValue(diagnostics.SuppliedPasswordHash));
            await HttpContext.Response.SendUnauthorizedAsync(cancellation: cancellationToken);
            return;
        }

        await authSessionService.SignInAsync(HttpContext, request.Username);

        var authenticateResult = await HttpContext.AuthenticateAsync();
        logger.LogInformation(
            "Login succeeded: username={Username}, authCookieIssued={AuthCookieIssued}, principalAuthenticated={PrincipalAuthenticated}",
            request.Username,
            HttpContext.Response.Headers.SetCookie.Count > 0,
            authenticateResult.Succeeded && authenticateResult.Principal?.Identity?.IsAuthenticated == true);

        await HttpContext.Response.SendOkAsync(new SessionResponse(true, request.Username), cancellation: cancellationToken);
    }
}
