using System.Text;
using System.Text.RegularExpressions;
using Pyrite.Api.Models;

namespace Pyrite.Api.Services;

public sealed class SearchService(PathSafetyService pathSafetyService)
{
    public async Task<SearchResponse> SearchAsync(string query, IEnumerable<string> candidatePaths, CancellationToken cancellationToken)
    {
        var results = new List<SearchResultDto>();
        var terms = ParseTerms(query);

        if (terms.Count == 0)
        {
            return new SearchResponse(string.Empty, results);
        }

        foreach (var candidatePath in candidatePaths)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var content = await File.ReadAllTextAsync(pathSafetyService.ResolvePath(candidatePath), cancellationToken);
            var title = Path.GetFileNameWithoutExtension(candidatePath);
            var candidateText = $"{candidatePath}\n{content}";
            var matchesAllTerms = terms.All(term => candidateText.Contains(term, StringComparison.OrdinalIgnoreCase));
            var contentIndex = FindFirstContentIndex(content, terms);

            if (!matchesAllTerms)
            {
                continue;
            }

            var snippet = contentIndex >= 0
                ? BuildSnippet(content, contentIndex, terms.First(term => content.Contains(term, StringComparison.OrdinalIgnoreCase)).Length)
                : title;
            results.Add(new SearchResultDto(candidatePath, title, snippet));
        }

        return new SearchResponse(query, results.OrderBy(result => result.Path, StringComparer.OrdinalIgnoreCase).ToArray());
    }

    private static IReadOnlyList<string> ParseTerms(string query)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return [];
        }

        var matches = Regex.Matches(query, "\"([^\"]+)\"|(\\S+)");
        var terms = new List<string>(matches.Count);

        foreach (Match match in matches)
        {
            var term = match.Groups[1].Success ? match.Groups[1].Value : match.Groups[2].Value;
            if (!string.IsNullOrWhiteSpace(term))
            {
                terms.Add(term);
            }
        }

        return terms;
    }

    private static int FindFirstContentIndex(string content, IReadOnlyList<string> terms)
    {
        var matches = terms
            .Select(term => content.IndexOf(term, StringComparison.OrdinalIgnoreCase))
            .Where(index => index >= 0)
            .OrderBy(index => index)
            .ToArray();

        return matches.Length == 0 ? -1 : matches[0];
    }

    private static string BuildSnippet(string content, int start, int length)
    {
        var snippetStart = Math.Max(0, start - 48);
        var snippetLength = Math.Min(content.Length - snippetStart, length + 96);
        var snippet = content.Substring(snippetStart, snippetLength).Replace('\n', ' ').Replace('\r', ' ').Trim();
        return snippet.Length > 180 ? $"{snippet[..177]}..." : snippet;
    }
}
