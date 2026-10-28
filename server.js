import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleVideoApi } from "./src/server/videos.js";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(rootDir, "dist");
const uploadsDir = path.join(rootDir, "public", "uploads");
const port = Number(process.env.PORT || 4173);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

function serveFile(request, response, filePath) {
  const fileStat = statSync(filePath);
  const range = request.headers.range;
  const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";

  response.setHeader("Content-Type", contentType);
  response.setHeader("X-Content-Type-Options", "nosniff");

  if (range && contentType === "video/mp4") {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      response.writeHead(416, { "Content-Range": `bytes */${fileStat.size}` });
      response.end();
      return;
    }

    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Math.min(Number(match[2]), fileStat.size - 1) : fileStat.size - 1;
    if (start >= fileStat.size || end < start) {
      response.writeHead(416, { "Content-Range": `bytes */${fileStat.size}` });
      response.end();
      return;
    }

    response.writeHead(206, {
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Content-Range": `bytes ${start}-${end}/${fileStat.size}`
    });
    createReadStream(filePath, { start, end }).pipe(response);
    return;
  }

  response.setHeader("Content-Length", fileStat.size);
  if (contentType === "video/mp4") response.setHeader("Accept-Ranges", "bytes");
  if (request.method === "HEAD") {
    response.writeHead(200);
    response.end();
    return;
  }
  response.writeHead(200);
  createReadStream(filePath).pipe(response);
}

const server = createServer(async (request, response) => {
  try {
    if (request.url?.startsWith("/api/videos")) {
      const handled = await handleVideoApi(request, response);
      if (handled) return;
    }

    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end("Method not allowed");
      return;
    }

    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    const decodedPath = decodeURIComponent(url.pathname);
    let filePath;

    if (decodedPath.startsWith("/uploads/")) {
      const uploadName = path.basename(decodedPath);
      filePath = path.join(uploadsDir, uploadName);
    } else if (decodedPath === "/") {
      filePath = path.join(distDir, "index.html");
    } else {
      const normalizedPath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
      filePath = path.resolve(distDir, `.${normalizedPath}`);
      if (!filePath.startsWith(`${distDir}${path.sep}`) && filePath !== path.join(distDir, "index.html")) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }
    }

    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      filePath = path.join(distDir, "index.html");
    }
    if (!existsSync(filePath)) {
      response.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Build the app first with npm run build.");
      return;
    }

    serveFile(request, response, filePath);
  } catch (error) {
    console.error("Web server request failed:", error);
    if (!response.headersSent) response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Internal server error");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`VynoraApp server listening on http://localhost:${port}`);
});
