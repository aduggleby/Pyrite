using FastEndpoints;
using Pyrite.Api.Models;
using Pyrite.Api.Services;

namespace Pyrite.Api.Endpoints.Notes;

public sealed class GetNoteEndpoint(VaultService vaultService) : EndpointWithoutRequest<NoteResponse>
{
    public override void Configure()
    {
        Get("/notes/{*path}");
    }

    public override async Task HandleAsync(CancellationToken cancellationToken)
    {
        var path = Route<string>("path") ?? string.Empty;
        var note = await vaultService.ReadNoteAsync(path, cancellationToken);
        await HttpContext.Response.SendOkAsync(note, cancellation: cancellationToken);
    }
}
