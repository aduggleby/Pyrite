using System.Net;
using System.Net.Http.Json;
using System.Text;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Pyrite.Api.Configuration;
using Pyrite.Api.Models;
using Pyrite.Api.Services;

namespace Pyrite.Api.Tests;

public sealed class AuthAndVaultTests(PyriteApplicationFactory factory) : IClassFixture<PyriteApplicationFactory>
{
    [Fact]
    public void HashPassword_matches_documented_openssl_value()
    {
        const string password = "marsh-heron-cinder-4817";
        const string documentedOpenSslHash = "7971eb89fa90ed40b57be4a529cd66812d4ef0be80e4f0089e5cdba42eacb353";

        PasswordHashService.HashPassword(password)
            .Should()
            .Be(documentedOpenSslHash);
    }

    [Fact]
    public async Task Login_logout_and_antiforgery_flow_work()
    {
        using var client = factory.CreateClientWithCookies();

        var anonymous = await client.GetFromJsonAsync<SessionResponse>("/api/auth/session");
        anonymous!.IsAuthenticated.Should().BeFalse();

        var badLoginResponse = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest("alex", "wrong"));
        badLoginResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest("alex", "password"));
        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var session = await client.GetFromJsonAsync<SessionResponse>("/api/auth/session");
        session!.IsAuthenticated.Should().BeTrue();
        session.Username.Should().Be("alex");

        var logoutWithoutToken = await client.PostAsync("/api/auth/logout", new StringContent(string.Empty));
        logoutWithoutToken.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var csrf = await client.GetFromJsonAsync<AntiforgeryTokenResponse>("/api/security/antiforgery-token");
        client.DefaultRequestHeaders.Add("X-PYRITE-CSRF", csrf!.RequestToken);

        var logoutResponse = await client.PostAsync("/api/auth/logout", new StringContent(string.Empty));
        logoutResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var afterLogout = await client.GetFromJsonAsync<SessionResponse>("/api/auth/session");
        afterLogout!.IsAuthenticated.Should().BeFalse();
    }

    [Fact]
    public async Task Notes_tree_and_path_safety_work()
    {
        using var client = factory.CreateClientWithCookies();
        await LoginAsync(client);

        var tree = await client.GetFromJsonAsync<List<VaultNodeDto>>("/api/vault/tree");
        tree.Should().NotBeNullOrEmpty();
        tree!.SelectMany(Flatten).Select(node => node.Path).Should().Contain("Inbox.md");

        var note = await client.GetFromJsonAsync<NoteResponse>("/api/notes/Inbox.md");
        note!.Title.Should().Be("Inbox");
        note.Wikilinks.Should().ContainSingle();
    }

    [Fact]
    public async Task Spa_routes_with_note_extensions_fall_back_to_index()
    {
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, "/view/Projects/Launch%20Plan.md");
        request.Headers.Accept.ParseAdd("text/html");

        var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType?.MediaType.Should().Be("text/html");
    }

    [Fact]
    public async Task Search_splits_unquoted_terms_and_preserves_quoted_phrases()
    {
        using var client = factory.CreateClientWithCookies();
        await LoginAsync(client);

        var andSearch = await client.GetFromJsonAsync<SearchResponse>("/api/search?q=launch%20ship");
        andSearch!.Results.Should().ContainSingle(result => result.Path == "Projects/Launch Plan.md");

        var exactPhrase = await client.GetFromJsonAsync<SearchResponse>("/api/search?q=%22Ship%20it%22");
        exactPhrase!.Results.Should().ContainSingle(result => result.Path == "Projects/Launch Plan.md");

        var reversedPhrase = await client.GetFromJsonAsync<SearchResponse>("/api/search?q=%22it%20Ship%22");
        reversedPhrase!.Results.Should().BeEmpty();
    }

    [Fact]
    public void PathSafetyService_rejects_path_traversal()
    {
        var service = new PathSafetyService(Options.Create(new PyriteOptions
        {
            VaultRoot = factory.VaultRoot
        }));

        var action = () => service.ResolvePath("../secret.md");
        action.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public async Task Stale_save_returns_conflict_and_merge_preview()
    {
        using var client = factory.CreateClientWithCookies();
        await LoginAsync(client);
        await ApplyCsrfAsync(client);

        var note = await client.GetFromJsonAsync<NoteResponse>("/api/notes/Inbox.md");
        File.WriteAllText(Path.Combine(factory.VaultRoot, "Inbox.md"), "# Inbox\n\nRemote edit.\n");

        var saveResponse = await client.PutAsJsonAsync("/api/notes/Inbox.md", new SaveNoteRequest("# Inbox\n\nLocal edit.\n", note!.VersionToken));
        saveResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var savePayload = await saveResponse.Content.ReadFromJsonAsync<SaveNoteResponse>();
        savePayload!.RequiresMerge.Should().BeTrue();

        var mergePreviewResponse = await client.PostAsJsonAsync(
            "/api/notes/merge-preview/Inbox.md",
            new MergePreviewRequest(note.Content, "# Inbox\n\nLocal edit.\n"));

        mergePreviewResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var mergePreview = await mergePreviewResponse.Content.ReadFromJsonAsync<MergePreviewResponse>();
        mergePreview!.RemoteContent.Should().Contain("Remote edit.");
    }

    [Fact]
    public async Task Attachment_upload_uses_safe_generated_name()
    {
        using var client = factory.CreateClientWithCookies();
        await LoginAsync(client);
        await ApplyCsrfAsync(client);

        using var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(Encoding.UTF8.GetBytes("fake-image"));
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/png");
        form.Add(fileContent, "file", "../../../sneaky name.png");

        var response = await client.PostAsync("/api/notes/attachments/Inbox.md", form);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var payload = await response.Content.ReadFromJsonAsync<AttachmentUploadResponse>();
        payload!.VaultPath.Should().StartWith(".attachments/");
        payload.FileName.Should().NotContain("..");
        File.Exists(Path.Combine(factory.VaultRoot, payload.VaultPath.Replace('/', Path.DirectorySeparatorChar))).Should().BeTrue();
    }

    private static IEnumerable<VaultNodeDto> Flatten(VaultNodeDto node)
    {
        yield return node;

        foreach (var child in node.Children.SelectMany(Flatten))
        {
            yield return child;
        }
    }

    private static async Task LoginAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest("alex", "password"));
        response.EnsureSuccessStatusCode();
    }

    private static async Task ApplyCsrfAsync(HttpClient client)
    {
        var csrf = await client.GetFromJsonAsync<AntiforgeryTokenResponse>("/api/security/antiforgery-token");
        client.DefaultRequestHeaders.Remove("X-PYRITE-CSRF");
        client.DefaultRequestHeaders.Add("X-PYRITE-CSRF", csrf!.RequestToken);
    }
}
