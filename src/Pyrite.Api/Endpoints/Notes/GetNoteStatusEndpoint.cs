using FastEndpoints;
using Pyrite.Api.Models;
using Pyrite.Api.Services;

namespace Pyrite.Api.Endpoints.Notes;

public sealed class GetNoteStatusEndpoint(VaultService vaultService) : EndpointWithoutRequest<NoteStatusResponse>
{
    public override void Configure()
    {
        Get("/notes/status/{*path}");
    }

    public override async Task HandleAsync(CancellationToken cancellationToken)
    {
        var path = Route<string>("path") ?? string.Empty;
        var clientVersion = Query<string>("clientVersion", false);
        var response = await vaultService.GetNoteStatusAsync(path, clientVersion, cancellationToken);
        await HttpContext.Response.SendOkAsync(response, cancellation: cancellationToken);
    }
}
