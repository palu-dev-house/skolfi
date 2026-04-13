import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Adapter that converts NextApiRequest to a Web API Request object,
 * allowing existing App Router-style handlers to work in Pages Router.
 */
class AdaptedRequest extends Request {
  private _nextUrl: URL;

  constructor(req: NextApiRequest) {
    const protocol = (req.headers["x-forwarded-proto"] as string) || "http";
    const host = req.headers.host || "localhost";
    const url = `${protocol}://${host}${req.url}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) {
        if (Array.isArray(value)) {
          for (const v of value) headers.append(key, v);
        } else {
          headers.set(key, value);
        }
      }
    }

    const init: RequestInit = {
      method: req.method,
      headers,
    };

    if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
      init.body = JSON.stringify(req.body);
    }

    super(url, init);
    this._nextUrl = new URL(url);
  }

  get nextUrl() {
    return this._nextUrl;
  }
}

// Permissive types: handlers may be typed with NextRequest or Promise<params>
// from the original App Router code. At runtime the adapter provides the correct
// shape (Request + nextUrl, sync params), so this is safe.
// biome-ignore lint/suspicious/noExplicitAny: compatibility shim
type HandlerFn = (request: any, context: any) => Promise<Response>;

interface RouteHandlers {
  GET?: HandlerFn;
  POST?: HandlerFn;
  PUT?: HandlerFn;
  DELETE?: HandlerFn;
  PATCH?: HandlerFn;
}

export function createApiHandler(handlers: RouteHandlers) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const method = (req.method?.toUpperCase() || "GET") as keyof RouteHandlers;
    const handler = handlers[method];

    if (!handler) {
      return res.status(405).json({
        success: false,
        error: { message: "Method not allowed", code: "METHOD_NOT_ALLOWED" },
      });
    }

    try {
      const request = new AdaptedRequest(req);

      // Extract route params from query (dynamic route segments)
      const params: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === "string") {
          params[key] = value;
        } else if (Array.isArray(value)) {
          params[key] = value.join("/");
        }
      }

      const response = await handler(request, { params });

      // Transfer response to NextApiResponse
      res.status(response.status);

      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const body = await response.json();
        res.json(body);
      } else {
        const body = await response.text();
        res.send(body);
      }
    } catch (error) {
      console.error("API handler error:", error);
      res.status(500).json({
        success: false,
        error: { message: "Internal server error", code: "SERVER_ERROR" },
      });
    }
  };
}
