using FastEndpoints;
using Microsoft.Extensions.Options;
using Pyrite.Api.Configuration;
using Pyrite.Api.Models;
using Pyrite.Api.Services;

namespace Pyrite.Api.Endpoints.Notes;

public sealed class UploadAttachmentEndpoint(
    VaultService vaultService,
    RequestSecurityService requestSecurityService,
    IOptions<PyriteOptions> options) : EndpointWithoutRequest<AttachmentUploadResponse>
{
    public override void Configure()
    {
        Post("/notes/attachments/{*path}");
        AllowFileUploads();
    }

    public override async Task HandleAsync(CancellationToken cancellationToken)
    {
        if (!await requestSecurityService.EnsureUnsafeRequestIsValidAsync(HttpContext))
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { error = "A valid antiforgery token is required." }, cancellationToken);
            return;
        }

        var path = Route<string>("path") ?? string.Empty;
        var file = Files.FirstOrDefault();

        if (file is null)
        {
            ThrowError("A file upload is required.");
        }

        var response = await vaultService.SaveAttachmentAsync(path, file!, options.Value.Uploads.MaxBytes, cancellationToken);
        await HttpContext.Response.SendOkAsync(response, cancellation: cancellationToken);
    }
}
