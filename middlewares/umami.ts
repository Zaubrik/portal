import {
  Context,
  createHttpError,
  isFalse,
  isHttpError,
  isObject,
  isString,
  Status,
} from "./deps.ts";
import { generateId, getGroup, type Umami } from "../functions/mod.ts";

export function getWebsitesFromUmami(umami: Umami) {
  return async <C extends Context>(ctx: C): Promise<C> => {
    try {
      const websiteResult = await umami.getWebsites();
      ctx.response = Response.json(websiteResult);
      return ctx;
    } catch (error) {
      throw isHttpError(error)
        ? error
        : createHttpError(Status.BadRequest, error.message);
    }
  };
}

export function getWebsiteFromUmami(umami: Umami) {
  return async <C extends Context>(ctx: C): Promise<C> => {
    try {
      const domain = getGroup(ctx.result, "pathname", "domain");
      try {
        const websiteResult = await umami.getWebsiteByDomain(domain);
        if (isObject(websiteResult)) {
          ctx.response = Response.json(websiteResult);
          return ctx;
        } else {
          throw new Error();
        }
      } catch {
        throw createHttpError(Status.NotFound);
      }
    } catch (error) {
      throw isHttpError(error)
        ? error
        : createHttpError(Status.BadRequest, error.message);
    }
  };
}

export function addWebsiteToUmami(umami: Umami) {
  return async <C extends Context>(ctx: C): Promise<C> => {
    try {
      const { domain, name, shareId } = await ctx.request.json();
      if (isString(domain) && isString(name)) {
        const websiteResult = await umami.createWebsite(
          isFalse(shareId) ? { domain, name } : {
            domain,
            name,
            shareId: isString(shareId) ? shareId : generateId(),
          },
        );
        ctx.response = Response.json(websiteResult);
        return ctx;
      } else {
        throw new Error("Invalid request body.");
      }
    } catch (error) {
      throw isHttpError(error)
        ? error
        : createHttpError(Status.BadRequest, error.message);
    }
  };
}

export function deleteWebsiteFromUmami(umami: Umami) {
  return async <C extends Context>(ctx: C): Promise<C> => {
    try {
      const { domain } = await ctx.request.json();
      if (isString(domain)) {
        try {
          const websiteResult = await umami.getWebsiteByDomain(domain);
          if (isObject(websiteResult)) {
            await umami.deleteWebsite(domain);
            ctx.response = new Response(null, { status: 204 });
            return ctx;
          } else {
            throw new Error();
          }
        } catch {
          throw createHttpError(Status.NotFound);
        }
      } else {
        throw new Error("Invalid request body.");
      }
    } catch (error) {
      throw isHttpError(error)
        ? error
        : createHttpError(Status.BadRequest, error.message);
    }
  };
}
