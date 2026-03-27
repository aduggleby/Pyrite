using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Pyrite.Api.Models;

namespace Pyrite.Api.Services;

public sealed partial class VaultService(
    PathSafetyService pathSafetyService,
    MarkdownService markdownService,
    MergeService mergeService)
{
    public Task<IReadOnlyList<VaultNodeDto>> GetTreeAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var root = new DirectoryInfo(pathSafetyService.VaultRoot);
        return Task.FromResult<IReadOnlyList<VaultNodeDto>>(BuildTree(root));
    }

    public async Task<NoteResponse> ReadNoteAsync(string vaultPath, CancellationToken cancellationToken)
    {
        var fullPath = pathSafetyService.ResolvePath(vaultPath);
        var bytes = await File.ReadAllBytesAsync(fullPath, cancellationToken);
        var content = Encoding.UTF8.GetString(bytes);
        var versionToken = GetVersionToken(bytes);
        var wikilinks = markdownService.ExtractWikilinks(vaultPath, content, ResolveWikiTarget);
        var tags = markdownService.ExtractTags(content);
        var tasks = markdownService.ExtractTasks(content);
        var previewHtml = markdownService.RenderHtml(vaultPath, content, ResolveWikiTarget);
        var backlinks = await GetBacklinksAsync(vaultPath, cancellationToken);

        return new NoteResponse(
            vaultPath,
            Path.GetFileNameWithoutExtension(vaultPath),
            content,
            versionToken,
            previewHtml,
            wikilinks,
            tags,
            backlinks,
            tasks);
    }

    public async Task<NoteStatusResponse> GetNoteStatusAsync(string vaultPath, string? clientVersionToken, CancellationToken cancellationToken)
    {
        var fullPath = pathSafetyService.ResolvePath(vaultPath);
        var bytes = await File.ReadAllBytesAsync(fullPath, cancellationToken);
        var versionToken = GetVersionToken(bytes);

        return new NoteStatusResponse(
            vaultPath,
            versionToken,
            !string.IsNullOrWhiteSpace(clientVersionToken) && !string.Equals(clientVersionToken, versionToken, StringComparison.Ordinal));
    }

    public async Task<SaveNoteResponse> SaveNoteAsync(string vaultPath, string content, string expectedVersionToken, CancellationToken cancellationToken)
    {
        var fullPath = pathSafetyService.ResolvePath(vaultPath);
        var currentBytes = await File.ReadAllBytesAsync(fullPath, cancellationToken);
        var currentVersion = GetVersionToken(currentBytes);

        if (!string.Equals(currentVersion, expectedVersionToken, StringComparison.Ordinal))
        {
            return new SaveNoteResponse(false, currentVersion, true);
        }

        var existingContent = Encoding.UTF8.GetString(currentBytes);
        var normalizedContent = NormalizeLineEndings(content, existingContent);
        var newBytes = Encoding.UTF8.GetBytes(normalizedContent);

        await File.WriteAllBytesAsync(fullPath, newBytes, cancellationToken);
        return new SaveNoteResponse(true, GetVersionToken(newBytes), false);
    }

    public async Task<MergePreviewResponse> CreateMergePreviewAsync(string vaultPath, string baseContent, string localContent, CancellationToken cancellationToken)
    {
        var fullPath = pathSafetyService.ResolvePath(vaultPath);
        var remoteBytes = await File.ReadAllBytesAsync(fullPath, cancellationToken);
        var remoteContent = Encoding.UTF8.GetString(remoteBytes);
        var remoteVersion = GetVersionToken(remoteBytes);

        return mergeService.BuildPreview(vaultPath, remoteVersion, baseContent, localContent, remoteContent);
    }

    public async Task<SaveNoteResponse> CommitMergedNoteAsync(string vaultPath, string content, string remoteVersionToken, CancellationToken cancellationToken)
    {
        return await SaveNoteAsync(vaultPath, content, remoteVersionToken, cancellationToken);
    }

    public async Task<AttachmentUploadResponse> SaveAttachmentAsync(string notePath, IFormFile file, long maxBytes, CancellationToken cancellationToken)
    {
        if (file.Length <= 0 || file.Length > maxBytes)
        {
            throw new InvalidOperationException("Attachment size is invalid.");
        }

        var noteFullPath = pathSafetyService.ResolvePath(notePath);
        var noteDirectory = Path.GetDirectoryName(noteFullPath) ?? pathSafetyService.VaultRoot;
        var attachmentsDirectory = Path.Combine(pathSafetyService.VaultRoot, ".attachments");
        Directory.CreateDirectory(attachmentsDirectory);

        var safeExtension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var safeBaseName = SlugRegex().Replace(Path.GetFileNameWithoutExtension(file.FileName).ToLowerInvariant(), "-").Trim('-');
        var generatedFileName = $"{DateTimeOffset.UtcNow:yyyyMMddHHmmss}-{safeBaseName}-{Guid.NewGuid():N}{safeExtension}";
        var destinationPath = Path.Combine(attachmentsDirectory, generatedFileName);

        await using (var stream = File.Create(destinationPath))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var vaultRelativePath = pathSafetyService.ToVaultRelativePath(destinationPath);
        var relativeLinkPath = Path.GetRelativePath(noteDirectory, destinationPath).Replace('\\', '/');
        return new AttachmentUploadResponse(
            generatedFileName,
            vaultRelativePath,
            $"![{Path.GetFileNameWithoutExtension(file.FileName)}]({relativeLinkPath})",
            file.Length);
    }

    public IEnumerable<string> EnumerateMarkdownPaths()
    {
        return Directory
            .EnumerateFiles(pathSafetyService.VaultRoot, "*.md", SearchOption.AllDirectories)
            .OrderBy(path => path, StringComparer.OrdinalIgnoreCase)
            .Select(pathSafetyService.ToVaultRelativePath);
    }

    public string? ResolveWikiTarget(string currentNotePath, string rawTarget)
    {
        var target = rawTarget.Trim();
        if (string.IsNullOrWhiteSpace(target))
        {
            return null;
        }

        if (!target.EndsWith(".md", StringComparison.OrdinalIgnoreCase))
        {
            target += ".md";
        }

        var currentDirectory = Path.GetDirectoryName(currentNotePath)?.Replace('\\', '/') ?? string.Empty;
        var localPath = string.IsNullOrWhiteSpace(currentDirectory) ? target : $"{currentDirectory}/{target}";

        if (File.Exists(pathSafetyService.ResolvePath(localPath)))
        {
            return localPath;
        }

        return EnumerateMarkdownPaths().FirstOrDefault(path =>
            string.Equals(path, target, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(Path.GetFileName(path), Path.GetFileName(target), StringComparison.OrdinalIgnoreCase) ||
            string.Equals(Path.GetFileNameWithoutExtension(path), Path.GetFileNameWithoutExtension(target), StringComparison.OrdinalIgnoreCase));
    }

    public async Task<IReadOnlyList<BacklinkDto>> GetBacklinksAsync(string notePath, CancellationToken cancellationToken)
    {
        var resolvedTargets = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            notePath,
            Path.GetFileName(notePath),
            Path.GetFileNameWithoutExtension(notePath)
        };

        var backlinks = new List<BacklinkDto>();

        foreach (var candidatePath in EnumerateMarkdownPaths())
        {
            if (string.Equals(candidatePath, notePath, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var candidateContent = await File.ReadAllTextAsync(pathSafetyService.ResolvePath(candidatePath), cancellationToken);
            var hasBacklink = markdownService
                .ExtractWikilinks(candidatePath, candidateContent, ResolveWikiTarget)
                .Any(link =>
                    link.ResolvedPath is not null &&
                    resolvedTargets.Contains(link.ResolvedPath) ||
                    resolvedTargets.Contains(link.Target));

            if (!hasBacklink)
            {
                continue;
            }

            backlinks.Add(new BacklinkDto(candidatePath, Path.GetFileNameWithoutExtension(candidatePath), BuildSnippet(candidateContent)));
        }

        return backlinks;
    }

    public static string GetVersionToken(byte[] bytes)
    {
        return Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
    }

    private static IReadOnlyList<VaultNodeDto> BuildTree(DirectoryInfo directory)
    {
        var directories = directory
            .EnumerateDirectories()
            .OrderBy(item => item.Name, StringComparer.OrdinalIgnoreCase)
            .Select(item => new VaultNodeDto(
                item.Name,
                item.FullName,
                true,
                BuildTree(item)))
            .ToList();

        var files = directory
            .EnumerateFiles("*.md")
            .OrderBy(item => item.Name, StringComparer.OrdinalIgnoreCase)
            .Select(item => new VaultNodeDto(item.Name, item.FullName, false, Array.Empty<VaultNodeDto>()))
            .ToList();

        return directories.Concat(files).ToArray();
    }

    private static string NormalizeLineEndings(string newContent, string existingContent)
    {
        var lineEnding = existingContent.Contains("\r\n", StringComparison.Ordinal) ? "\r\n" : "\n";
        return newContent.Replace("\r\n", "\n").Replace("\n", lineEnding);
    }

    private static string BuildSnippet(string content)
    {
        var line = content.Split('\n', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()?.Trim() ?? string.Empty;
        return line.Length > 160 ? $"{line[..157]}..." : line;
    }

    [GeneratedRegex(@"[^a-z0-9]+")]
    private static partial Regex SlugRegex();
}
