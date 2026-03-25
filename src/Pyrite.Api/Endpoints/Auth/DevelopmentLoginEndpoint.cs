using FastEndpoints;
using Microsoft.Extensions.Options;
using Pyrite.Api.Configuration;
using Pyrite.Api.Models;
using Pyrite.Api.Services;

namespace Pyrite.Api.Endpoints.Auth;

public sealed class DevelopmentLoginEndpoint(
    IWebHostEnvironment environment,
    IOptions<PyriteOptions> options,
    AuthSessionService authSessionService) : EndpointWithoutRequest<SessionResponse>
{
    public override void Configure()
    {
        Post("/auth/dev-login");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken cancellationToken)
    {
        if (!environment.IsDevelopment())
        {
            await HttpContext.Response.SendNotFoundAsync(cancellation: cancellationToken);
            return;
        }

        var username = options.Value.Auth.Username;
        await authSessionService.SignInAsync(HttpContext, username);
        await HttpContext.Response.SendOkAsync(new SessionResponse(true, username), cancellation: cancellationToken);
    }
}
