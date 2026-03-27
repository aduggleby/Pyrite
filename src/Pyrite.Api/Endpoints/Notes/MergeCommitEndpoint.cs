using FastEndpoints;
using Pyrite.Api.Models;
using Pyrite.Api.Services;

namespace Pyrite.Api.Endpoints.Notes;

public sealed class MergeCommitEndpoint(VaultService vaultService, RequestSecurityService requestSecurityService) : Endpoint<MergeCommitRequest, SaveNoteResponse>
{
    public override void Configure()
    {
        Post("/notes/merge-commit/{*path}");
    }

    public override async Task HandleAsync(MergeCommitRequest request, CancellationToken cancellationToken)
    {
        if (!await requestSecurityService.EnsureUnsafeRequestIsValidAsync(HttpContext))
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { error = "A valid antiforgery token is required." }, cancellationToken);
            return;
        }

        var path = Route<string>("path") ?? string.Empty;
        var response = await vaultService.CommitMergedNoteAsync(path, request.Content, request.RemoteVersionToken, cancellationToken);

        var statusCode = response.RequiresMerge ? StatusCodes.Status409Conflict : StatusCodes.Status200OK;
        await HttpContext.Response.SendAsync(response, statusCode, cancellation: cancellationToken);
    }
}
