import { onRequestPost } from "../functions/api/weather";

interface Env {
  GEMINI_API_KEY?: string;
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);

    // Route POST API requests to the weather function
    if (url.pathname === "/api/weather" && request.method === "POST") {
      return onRequestPost({ request, env });
    }

    // Serve static assets from Cloudflare's Asset hosting
    let response = await env.ASSETS.fetch(request);

    // If a request is not found (404), fall back to index.html for Single Page Application routing
    if (response.status === 404) {
      const indexRequest = new Request(new URL("/index.html", request.url), request);
      response = await env.ASSETS.fetch(indexRequest);
    }

    return response;
  }
};
