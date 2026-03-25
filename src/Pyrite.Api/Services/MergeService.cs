using Pyrite.Api.Models;

namespace Pyrite.Api.Services;

public sealed class MergeService
{
    public MergePreviewResponse BuildPreview(string path, string remoteVersionToken, string baseContent, string localContent, string remoteContent)
    {
        var baseLines = SplitLines(baseContent);
        var localLines = SplitLines(localContent);
        var remoteLines = SplitLines(remoteContent);
        var merged = new List<string>();
        var conflicts = new List<MergeConflictDto>();

        var max = Math.Max(baseLines.Length, Math.Max(localLines.Length, remoteLines.Length));

        for (var index = 0; index < max; index++)
        {
            var baseLine = LineAt(baseLines, index);
            var localLine = LineAt(localLines, index);
            var remoteLine = LineAt(remoteLines, index);

            if (localLine == remoteLine)
            {
                merged.Add(localLine);
                continue;
            }

            if (baseLine == remoteLine)
            {
                merged.Add(localLine);
                continue;
            }

            if (baseLine == localLine)
            {
                merged.Add(remoteLine);
                continue;
            }

            conflicts.Add(new MergeConflictDto(conflicts.Count, baseLine, localLine, remoteLine));
            merged.Add("<<<<<<< LOCAL");
            merged.Add(localLine);
            merged.Add("=======");
            merged.Add(remoteLine);
            merged.Add(">>>>>>> REMOTE");
        }

        return new MergePreviewResponse(
            path,
            remoteVersionToken,
            remoteContent,
            string.Join('\n', merged),
            conflicts.Count > 0,
            conflicts);
    }

    private static string[] SplitLines(string content)
    {
        return content.Replace("\r\n", "\n").Split('\n');
    }

    private static string LineAt(string[] lines, int index)
    {
        return index < lines.Length ? lines[index] : string.Empty;
    }
}
