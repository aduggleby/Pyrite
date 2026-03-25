using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Pyrite.Api.Configuration;

namespace Pyrite.Api.Services;

public sealed class PasswordHashService(IOptions<PyriteOptions> options)
{
    private readonly PyriteOptions _options = options.Value;

    public bool MatchesConfiguredPassword(string username, string password)
    {
        if (!string.Equals(username, _options.Auth.Username, StringComparison.Ordinal))
        {
            return false;
        }

        return string.Equals(HashPassword(password), _options.Auth.PasswordSha256, StringComparison.Ordinal);
    }

    public static string HashPassword(string password)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(password));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    public static bool IsValidSha256(string hash)
    {
        return hash.Length == 64 && hash.All(c => char.IsAsciiHexDigit(c)) && hash == hash.ToLowerInvariant();
    }
}
