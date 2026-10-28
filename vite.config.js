import { defineConfig } from "vite";
import { handleVideoApi } from "./src/server/videos.js";

function videoApiPlugin() {
  const middleware = (request, response, next) => {
    if (!request.url?.startsWith("/api/videos")) {
      next();
      return;
    }

    handleVideoApi(request, response).catch((error) => {
      console.error("Video API middleware failed:", error);
      if (!response.headersSent) {
        response.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      }
      response.end(JSON.stringify({ error: "Terjadi kesalahan pada server." }));
    });
  };

  return {
    name: "vynora-video-api",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    }
  };
}

export default defineConfig({
  plugins: [videoApiPlugin()]
});
