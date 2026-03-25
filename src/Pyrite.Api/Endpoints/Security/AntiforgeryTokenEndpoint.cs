using FastEndpoints;
using Microsoft.AspNetCore.Antiforgery;
using Pyrite.Api.Models;

namespace Pyrite.Api.Endpoints.Security;

public sealed class AntiforgeryTokenEndpoint(IAntiforgery antiforgery) : EndpointWithoutRequest<AntiforgeryTokenResponse>
{
    public override void Configure()
    {
        Get("/security/antiforgery-token");
    }

    public override async Task HandleAsync(CancellationToken cancellationToken)
    {
        var tokens = antiforgery.GetAndStoreTokens(HttpContext);
        await HttpContext.Response.SendOkAsync(new AntiforgeryTokenResponse(tokens.RequestToken ?? string.Empty), cancellation: cancellationToken);
    }
}
