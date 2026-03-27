using FastEndpoints;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Pyrite.Api.Services;

namespace Pyrite.Api.Endpoints.Auth;

public sealed class LogoutEndpoint(RequestSecurityService requestSecurityService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Post("/auth/logout");
    }

    public override async Task HandleAsync(CancellationToken cancellationToken)
    {
        if (!await requestSecurityService.EnsureUnsafeRequestIsValidAsync(HttpContext))
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { error = "A valid antiforgery token is required." }, cancellationToken);
            return;
        }

        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        await HttpContext.Response.SendNoContentAsync(cancellation: cancellationToken);
    }
}
