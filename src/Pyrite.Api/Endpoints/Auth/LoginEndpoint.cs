using FastEndpoints;
using Pyrite.Api.Models;
using Pyrite.Api.Services;

namespace Pyrite.Api.Endpoints.Auth;

public sealed class LoginEndpoint(PasswordHashService passwordHashService, AuthSessionService authSessionService) : Endpoint<LoginRequest, SessionResponse>
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

        await authSessionService.SignInAsync(HttpContext, request.Username);

        await HttpContext.Response.SendOkAsync(new SessionResponse(true, request.Username), cancellation: cancellationToken);
    }
}
