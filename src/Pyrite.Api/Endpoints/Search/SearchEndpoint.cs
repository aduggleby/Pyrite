using FastEndpoints;
using Pyrite.Api.Models;
using Pyrite.Api.Services;

namespace Pyrite.Api.Endpoints.Search;

public sealed class SearchEndpoint(SearchService searchService, VaultService vaultService) : EndpointWithoutRequest<SearchResponse>
{
    public override void Configure()
    {
        Get("/search");
    }

    public override async Task HandleAsync(CancellationToken cancellationToken)
    {
        var query = Query<string>("q", false) ?? string.Empty;
        var response = await searchService.SearchAsync(query, vaultService.EnumerateMarkdownPaths(), cancellationToken);
        await HttpContext.Response.SendOkAsync(response, cancellation: cancellationToken);
    }
}
