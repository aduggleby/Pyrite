using System.ComponentModel.DataAnnotations;

namespace Pyrite.Api.Configuration;

public sealed class PyriteOptions
{
    public const string SectionName = "Pyrite";

    [Required]
    public string VaultRoot { get; init; } = string.Empty;

    public AuthOptions Auth { get; init; } = new();

    public UploadOptions Uploads { get; init; } = new();
}

public sealed class AuthOptions
{
    [Required]
    public string Username { get; init; } = string.Empty;

    [Required]
    public string PasswordSha256 { get; init; } = string.Empty;
}

public sealed class UploadOptions
{
    [Range(1, 50_000_000)]
    public long MaxBytes { get; init; } = 10_000_000;
}
