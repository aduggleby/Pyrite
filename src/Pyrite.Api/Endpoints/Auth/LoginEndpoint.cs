using System.Security.Claims;
using FastEndpoints;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Pyrite.Api.Models;
using Pyrite.Api.Services;

namespace Pyrite.Api.Endpoints.Auth;

public sealed class LoginEndpoint(PasswordHashService passwordHashService) : Endpoint<LoginRequest, SessionResponse>
{
    public override void Configure()
    {
        Post("/auth/login");
        AllowAnonymous();
        Options(builder => builder.RequireRateLimiting("login"));
    }

    public override async Task HandleAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        if (!passwordHashService.MatchesConfiguredPassword(request.Username, request.Password))
        {
            await HttpContext.Response.SendUnauthorizedAsync(cancellation: cancellationToken);
            return;
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, request.Username)
        };

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            principal,
            new AuthenticationProperties
            {
                IsPersistent = true,
                ExpiresUtc = DateTimeOffset.UtcNow.AddDays(7)
            });

        await HttpContext.Response.SendOkAsync(new SessionResponse(true, request.Username), cancellation: cancellationToken);
    }
}
