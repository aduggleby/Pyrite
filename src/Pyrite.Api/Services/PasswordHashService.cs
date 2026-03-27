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
        return DiagnoseMatch(username, password).IsMatch;
    }

    public PasswordMatchDiagnostics DiagnoseMatch(string username, string password)
    {
        var hashedPassword = HashPassword(password);
        var usernameMatches = string.Equals(username, _options.Auth.Username, StringComparison.Ordinal);
        var hashMatches = string.Equals(hashedPassword, _options.Auth.PasswordSha256, StringComparison.Ordinal);

        return new PasswordMatchDiagnostics(
            usernameMatches && hashMatches,
            usernameMatches,
            hashMatches,
            _options.Auth.Username,
            username,
            _options.Auth.PasswordSha256,
            hashedPassword);
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

    public static string ToHashFingerprint(string hash)
    {
        if (string.IsNullOrEmpty(hash))
        {
            return "<empty>";
        }

        if (hash.Length <= 12)
        {
            return hash;
        }

        return $"{hash[..6]}...{hash[^6..]}";
    }

    public static string DescribeValue(string value)
    {
        return $"len={value.Length}, leadingWhitespace={char.IsWhiteSpace(value.FirstOrDefault())}, trailingWhitespace={char.IsWhiteSpace(value.LastOrDefault())}, containsWhitespace={value.Any(char.IsWhiteSpace)}, startsWithQuote={(value.StartsWith('\"') || value.StartsWith('\''))}, endsWithQuote={(value.EndsWith('\"') || value.EndsWith('\''))}";
    }
}

public sealed record PasswordMatchDiagnostics(
    bool IsMatch,
    bool UsernameMatches,
    bool PasswordHashMatches,
    string ConfiguredUsername,
    string SuppliedUsername,
    string ConfiguredPasswordHash,
    string SuppliedPasswordHash);
