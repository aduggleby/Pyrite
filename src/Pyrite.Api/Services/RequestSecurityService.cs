using Microsoft.AspNetCore.Antiforgery;

namespace Pyrite.Api.Services;

public sealed class RequestSecurityService(IAntiforgery antiforgery)
{
    public async Task<bool> EnsureUnsafeRequestIsValidAsync(HttpContext context)
    {
        if (!context.User.Identity?.IsAuthenticated ?? true)
        {
            return true;
        }

        if (!HttpMethods.IsPost(context.Request.Method) &&
            !HttpMethods.IsPut(context.Request.Method) &&
            !HttpMethods.IsPatch(context.Request.Method) &&
            !HttpMethods.IsDelete(context.Request.Method))
        {
            return true;
        }

        return await antiforgery.IsRequestValidAsync(context);
    }
}
