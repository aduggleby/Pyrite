using Microsoft.Extensions.Options;
using Pyrite.Api.Configuration;

namespace Pyrite.Api.Services;

public sealed class PathSafetyService(IOptions<PyriteOptions> options)
{
    private readonly string _vaultRoot = Path.GetFullPath(options.Value.VaultRoot);

    public string VaultRoot => _vaultRoot;

    public string ResolvePath(string relativePath)
    {
        var normalized = relativePath.Replace('\\', '/').Trim('/');
        var combined = Path.GetFullPath(Path.Combine(_vaultRoot, normalized));

        if (!combined.StartsWith(_vaultRoot, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Path escapes the configured vault root.");
        }

        return combined;
    }

    public string ToVaultRelativePath(string fullPath)
    {
        var relative = Path.GetRelativePath(_vaultRoot, fullPath);
        return relative.Replace('\\', '/');
    }
}
