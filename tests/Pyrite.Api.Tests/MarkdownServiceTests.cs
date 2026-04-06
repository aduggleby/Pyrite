using FluentAssertions;
using Pyrite.Api.Services;

namespace Pyrite.Api.Tests;

public sealed class MarkdownServiceTests
{
    [Fact]
    public void RenderHtml_renders_fenced_code_blocks_as_preformatted_block()
    {
        var service = new MarkdownService();
        const string markdown = """
```csharp
var answer = 42;
Console.WriteLine(answer);
```
""";

        var html = service.RenderHtml("Inbox.md", markdown, static (_, _) => null);

        html.Should().Contain("<pre><code class=\"language-csharp\">");
        html.Should().Contain("var answer = 42;");
        html.Should().Contain("Console.WriteLine(answer);");
        html.Should().Contain("</code></pre>");
    }

    [Fact]
    public void RenderHtml_treats_soft_line_breaks_as_html_line_breaks()
    {
        var service = new MarkdownService();
        const string markdown = """
first line
second line
""";

        var html = service.RenderHtml("Inbox.md", markdown, static (_, _) => null);

        html.Should().Contain("first line<br");
        html.Should().Contain("second line");
    }
}
