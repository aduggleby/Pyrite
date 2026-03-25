namespace Pyrite.Api.Models;

public sealed record LoginRequest(string Username, string Password);

public sealed record SessionResponse(bool IsAuthenticated, string? Username);

public sealed record AntiforgeryTokenResponse(string RequestToken);
