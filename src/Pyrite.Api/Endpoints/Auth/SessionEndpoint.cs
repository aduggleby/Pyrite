using FastEndpoints;
using Pyrite.Api.Models;

namespace Pyrite.Api.Endpoints.Auth;

public sealed class SessionEndpoint : EndpointWithoutRequest<SessionResponse>
{
    public override void Configure()
    {
        Get("/auth/session");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken cancellationToken)
    {
        var username = User.Identity?.IsAuthenticated == true ? User.Identity.Name : null;
        await HttpContext.Response.SendOkAsync(new SessionResponse(username is not null, username), cancellation: cancellationToken);
    }
}
