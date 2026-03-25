using System.Text;
using Pyrite.Api.Models;

namespace Pyrite.Api.Services;

public sealed class SearchService(PathSafetyService pathSafetyService)
{
    public async Task<SearchResponse> SearchAsync(string query, IEnumerable<string> candidatePaths, CancellationToken cancellationToken)
    {
        var results = new List<SearchResultDto>();

        if (string.IsNullOrWhiteSpace(query))
        {
            return new SearchResponse(string.Empty, results);
        }

        foreach (var candidatePath in candidatePaths)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var content = await File.ReadAllTextAsync(pathSafetyService.ResolvePath(candidatePath), cancellationToken);
            var title = Path.GetFileNameWithoutExtension(candidatePath);
            var fileMatch = candidatePath.Contains(query, StringComparison.OrdinalIgnoreCase);
            var contentIndex = content.IndexOf(query, StringComparison.OrdinalIgnoreCase);

            if (!fileMatch && contentIndex < 0)
            {
                continue;
            }

            var snippet = contentIndex >= 0 ? BuildSnippet(content, contentIndex, query.Length) : title;
            results.Add(new SearchResultDto(candidatePath, title, snippet));
        }

        return new SearchResponse(query, results.OrderBy(result => result.Path, StringComparer.OrdinalIgnoreCase).ToArray());
    }

    private static string BuildSnippet(string content, int start, int length)
    {
        var snippetStart = Math.Max(0, start - 48);
        var snippetLength = Math.Min(content.Length - snippetStart, length + 96);
        var snippet = content.Substring(snippetStart, snippetLength).Replace('\n', ' ').Replace('\r', ' ').Trim();
        return snippet.Length > 180 ? $"{snippet[..177]}..." : snippet;
    }
}
