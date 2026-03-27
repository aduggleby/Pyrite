using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.Extensions.Options;

namespace Pyrite.Api.Services;

public sealed class AuthSessionService(ILogger<AuthSessionService> logger)
{
    public async Task SignInAsync(HttpContext context, string username)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, username)
        };

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);

        await context.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            principal,
            new AuthenticationProperties
            {
                IsPersistent = true,
                ExpiresUtc = DateTimeOffset.UtcNow.AddDays(7)
            });

        logger.LogInformation(
            "Auth session issued: username={Username}, cookieName={CookieName}, requestScheme={Scheme}, host={Host}, pathBase={PathBase}, setCookieHeaderCount={SetCookieHeaderCount}",
            username,
            context.RequestServices.GetRequiredService<IOptionsMonitor<CookieAuthenticationOptions>>().Get(CookieAuthenticationDefaults.AuthenticationScheme).Cookie.Name,
            context.Request.Scheme,
            context.Request.Host.Value,
            context.Request.PathBase.Value ?? string.Empty,
            context.Response.Headers.SetCookie.Count);
    }
}
