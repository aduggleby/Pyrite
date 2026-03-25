using FastEndpoints;
using Pyrite.Api.Models;
using Pyrite.Api.Services;

namespace Pyrite.Api.Endpoints.Notes;

public sealed class SaveNoteEndpoint(VaultService vaultService, RequestSecurityService requestSecurityService) : Endpoint<SaveNoteRequest, SaveNoteResponse>
{
    public override void Configure()
    {
        Put("/notes/{*path}");
    }

    public override async Task HandleAsync(SaveNoteRequest request, CancellationToken cancellationToken)
    {
        if (!await requestSecurityService.EnsureUnsafeRequestIsValidAsync(HttpContext))
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { error = "A valid antiforgery token is required." }, cancellationToken);
            return;
        }

        var path = Route<string>("path") ?? string.Empty;
        var response = await vaultService.SaveNoteAsync(path, request.Content, request.ExpectedVersionToken, cancellationToken);

        var statusCode = response.RequiresMerge ? StatusCodes.Status409Conflict : StatusCodes.Status200OK;
        await HttpContext.Response.SendAsync(response, statusCode, cancellation: cancellationToken);
    }
}
