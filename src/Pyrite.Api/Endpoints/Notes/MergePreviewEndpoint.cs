using FastEndpoints;
using Pyrite.Api.Models;
using Pyrite.Api.Services;

namespace Pyrite.Api.Endpoints.Notes;

public sealed class MergePreviewEndpoint(VaultService vaultService, RequestSecurityService requestSecurityService) : Endpoint<MergePreviewRequest, MergePreviewResponse>
{
    public override void Configure()
    {
        Post("/notes/merge-preview/{*path}");
    }

    public override async Task HandleAsync(MergePreviewRequest request, CancellationToken cancellationToken)
    {
        if (!await requestSecurityService.EnsureUnsafeRequestIsValidAsync(HttpContext))
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { error = "A valid antiforgery token is required." }, cancellationToken);
            return;
        }

        var path = Route<string>("path") ?? string.Empty;
        var response = await vaultService.CreateMergePreviewAsync(path, request.BaseContent, request.LocalContent, cancellationToken);
        await HttpContext.Response.SendOkAsync(response, cancellation: cancellationToken);
    }
}
