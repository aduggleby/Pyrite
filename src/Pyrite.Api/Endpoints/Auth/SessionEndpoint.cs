using FastEndpoints;
using Pyrite.Api.Models;

namespace Pyrite.Api.Endpoints.Auth;

public sealed class SessionEndpoint(ILogger<SessionEndpoint> logger) : EndpointWithoutRequest<SessionResponse>
{
    public override void Configure()
    {
        Get("/auth/session");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken cancellationToken)
    {
        var username = User.Identity?.IsAuthenticated == true ? User.Identity.Name : null;
        logger.LogInformation(
            "Session check: authenticated={IsAuthenticated}, username={Username}, hasAuthCookie={HasAuthCookie}, hasCsrfCookie={HasCsrfCookie}",
            username is not null,
            username ?? "<anonymous>",
            HttpContext.Request.Cookies.ContainsKey("pyrite-auth"),
            HttpContext.Request.Cookies.ContainsKey("pyrite-csrf"));
        await HttpContext.Response.SendOkAsync(new SessionResponse(username is not null, username), cancellation: cancellationToken);
    }
}
