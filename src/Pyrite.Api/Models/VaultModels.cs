namespace Pyrite.Api.Models;

public sealed record VaultNodeDto(string Name, string Path, bool IsDirectory, IReadOnlyList<VaultNodeDto> Children);

public sealed record WikilinkDto(string Label, string Target, string? ResolvedPath);

public sealed record TagDto(string Value);

public sealed record BacklinkDto(string Path, string Title, string Snippet);

public sealed record TaskItemDto(string Text, bool IsCompleted);

public sealed record NoteResponse(
    string Path,
    string Title,
    string Content,
    string VersionToken,
    string PreviewHtml,
    IReadOnlyList<WikilinkDto> Wikilinks,
    IReadOnlyList<TagDto> Tags,
    IReadOnlyList<BacklinkDto> Backlinks,
    IReadOnlyList<TaskItemDto> Tasks);

public sealed record SaveNoteRequest(string Content, string ExpectedVersionToken);

public sealed record SaveNoteResponse(bool Saved, string VersionToken, bool RequiresMerge);

public sealed record NoteStatusResponse(string Path, string VersionToken, bool ChangedSinceClientVersion);

public sealed record MergePreviewRequest(string BaseContent, string LocalContent);

public sealed record MergePreviewResponse(
    string Path,
    string RemoteVersionToken,
    string RemoteContent,
    string MergedContent,
    bool HasConflicts,
    IReadOnlyList<MergeConflictDto> Conflicts);

public sealed record MergeConflictDto(int Index, string Base, string Local, string Remote);

public sealed record MergeCommitRequest(string Content, string RemoteVersionToken);

public sealed record AttachmentUploadResponse(string FileName, string VaultPath, string MarkdownLink, long SizeBytes);

public sealed record SearchResultDto(string Path, string Title, string Snippet);

public sealed record SearchResponse(string Query, IReadOnlyList<SearchResultDto> Results);
