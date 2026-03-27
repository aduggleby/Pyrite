using System.Text.RegularExpressions;
using Markdig;
using Markdig.Extensions.Yaml;
using Pyrite.Api.Models;

namespace Pyrite.Api.Services;

public sealed partial class MarkdownService
{
    private readonly MarkdownPipeline _pipeline = new MarkdownPipelineBuilder()
        .UseAdvancedExtensions()
        .UseSoftlineBreakAsHardlineBreak()
        .UseYamlFrontMatter()
        .Build();

    public string RenderHtml(string notePath, string content, Func<string, string, string?> resolveWikiPath)
    {
        var transformed = TransformTasks(TransformCallouts(TransformWikilinks(notePath, content, resolveWikiPath)));
        return EnableTaskCheckboxes(Markdown.ToHtml(transformed, _pipeline));
    }

    public IReadOnlyList<WikilinkDto> ExtractWikilinks(string notePath, string content, Func<string, string, string?> resolveWikiPath)
    {
        return WikiRegex()
            .Matches(content)
            .Select(match =>
            {
                var rawTarget = match.Groups["target"].Value.Trim();
                var label = match.Groups["label"].Success ? match.Groups["label"].Value.Trim() : rawTarget;
                return new WikilinkDto(label, rawTarget, resolveWikiPath(notePath, rawTarget));
            })
            .ToArray();
    }

    public IReadOnlyList<TagDto> ExtractTags(string content)
    {
        return TagRegex()
            .Matches(content)
            .Select(match => new TagDto(match.Groups["value"].Value))
            .DistinctBy(tag => tag.Value, StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    public IReadOnlyList<TaskItemDto> ExtractTasks(string content)
    {
        return TaskRegex()
            .Matches(content)
            .Select(match => new TaskItemDto(match.Groups["text"].Value.Trim(), string.Equals(match.Groups["state"].Value, "x", StringComparison.OrdinalIgnoreCase)))
            .ToArray();
    }

    private static string TransformWikilinks(string notePath, string content, Func<string, string, string?> resolveWikiPath)
    {
        return WikiRegex().Replace(content, match =>
        {
            var rawTarget = match.Groups["target"].Value.Trim();
            var label = match.Groups["label"].Success ? match.Groups["label"].Value.Trim() : rawTarget;
            var resolvedPath = resolveWikiPath(notePath, rawTarget);

            if (resolvedPath is null)
            {
                return $"**{label}**";
            }

            var href = $"/notes/{Uri.EscapeDataString(resolvedPath)}";
            return $"[{label}]({href})";
        });
    }

    private static string TransformCallouts(string content)
    {
        return CalloutRegex().Replace(content, match =>
        {
            var kind = match.Groups["kind"].Value.ToUpperInvariant();
            var title = match.Groups["title"].Value.Trim();
            var heading = string.IsNullOrWhiteSpace(title) ? kind : $"{kind}: {title}";
            return $"> **{heading}**";
        });
    }

    private static string TransformTasks(string content)
    {
        return TaskRegex().Replace(content, match =>
        {
            var text = match.Groups["text"].Value.Trim();
            var isCompleted = string.Equals(match.Groups["state"].Value, "x", StringComparison.OrdinalIgnoreCase);
            var checkedAttribute = isCompleted ? " checked" : string.Empty;
            return $"- <input type=\"checkbox\"{checkedAttribute} /> {text}";
        });
    }

    private static string EnableTaskCheckboxes(string html)
    {
        return html
            .Replace("disabled=\"\"", string.Empty, StringComparison.OrdinalIgnoreCase)
            .Replace(" disabled", string.Empty, StringComparison.OrdinalIgnoreCase);
    }

    [GeneratedRegex(@"\[\[(?<target>[^\]|#]+)(?:#[^\]|]+)?(?:\|(?<label>[^\]]+))?\]\]")]
    private static partial Regex WikiRegex();

    [GeneratedRegex(@"(?<![\w/])#(?<value>[A-Za-z0-9_\-/]+)")]
    private static partial Regex TagRegex();

    [GeneratedRegex(@"^\s*[-*]\s+\[(?<state>[ xX])\]\s+(?<text>.+)$", RegexOptions.Multiline)]
    private static partial Regex TaskRegex();

    [GeneratedRegex(@"^>\s+\[!(?<kind>[A-Za-z]+)\]\s*(?<title>.*)$", RegexOptions.Multiline)]
    private static partial Regex CalloutRegex();
}
