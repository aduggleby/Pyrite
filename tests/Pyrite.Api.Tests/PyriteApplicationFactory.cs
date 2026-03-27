using System.Net.Http.Headers;
using Microsoft.AspNetCore.Hosting;
using System.Text;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace Pyrite.Api.Tests;

public sealed class PyriteApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    public string VaultRoot { get; } = Path.Combine(Path.GetTempPath(), $"pyrite-tests-{Guid.NewGuid():N}");
    public string AppContentRoot { get; } = Path.Combine(Path.GetTempPath(), $"pyrite-app-{Guid.NewGuid():N}");

    public Task InitializeAsync()
    {
        Directory.CreateDirectory(VaultRoot);
        Directory.CreateDirectory(AppContentRoot);
        Directory.CreateDirectory(Path.Combine(AppContentRoot, "wwwroot"));
        Directory.CreateDirectory(Path.Combine(VaultRoot, "Projects"));
        File.WriteAllText(Path.Combine(VaultRoot, "Inbox.md"), "# Inbox\n\nSee [[Projects/Launch Plan]].\n");
        File.WriteAllText(Path.Combine(VaultRoot, "Projects", "Launch Plan.md"), "# Launch Plan\n\nShip it.\n");
        File.WriteAllText(Path.Combine(AppContentRoot, "wwwroot", "index.html"), "<!doctype html><html><body><div id=\"root\">Pyrite</div></body></html>");
        return Task.CompletedTask;
    }

    public new Task DisposeAsync()
    {
        if (Directory.Exists(VaultRoot))
        {
            Directory.Delete(VaultRoot, recursive: true);
        }

        if (Directory.Exists(AppContentRoot))
        {
            Directory.Delete(AppContentRoot, recursive: true);
        }

        return Task.CompletedTask;
    }

    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseContentRoot(AppContentRoot);
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Pyrite:VaultRoot"] = VaultRoot,
                ["Pyrite:Auth:Username"] = "alex",
                ["Pyrite:Auth:PasswordSha256"] = "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
                ["Pyrite:Uploads:MaxBytes"] = "10000000"
            });
        });
    }

    public HttpClient CreateClientWithCookies()
    {
        return CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            HandleCookies = true
        });
    }
}
