using FastEndpoints;
using Pyrite.Api.Models;
using Pyrite.Api.Services;

namespace Pyrite.Api.Endpoints.Vault;

public sealed class TreeEndpoint(VaultService vaultService, PathSafetyService pathSafetyService) : EndpointWithoutRequest<IReadOnlyList<VaultNodeDto>>
{
    public override void Configure()
    {
        Get("/vault/tree");
    }

    public override async Task HandleAsync(CancellationToken cancellationToken)
    {
        var tree = await vaultService.GetTreeAsync(cancellationToken);
        var normalized = Normalize(tree);
        await HttpContext.Response.SendOkAsync(normalized, cancellation: cancellationToken);
    }

    private IReadOnlyList<VaultNodeDto> Normalize(IReadOnlyList<VaultNodeDto> nodes)
    {
        return nodes
            .Select(node => node with
            {
                Path = pathSafetyService.ToVaultRelativePath(node.Path),
                Children = Normalize(node.Children)
            })
            .ToArray();
    }
}
