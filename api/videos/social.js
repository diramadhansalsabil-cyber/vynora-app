import { put } from "@vercel/blob";
import { ApiError, resolveSocialVideo } from "../../src/server/videos.js";

const recentPosts = new Map();

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

function checkRateLimit(request) {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  if (recentPosts.size > 5000) {
    for (const [knownAddress, timestamps] of recentPosts) {
      if (timestamps.every((time) => now - time >= 10 * 60 * 1000)) recentPosts.delete(knownAddress);
    }
  }
  const recent = (recentPosts.get(address) || []).filter((time) => now - time < 10 * 60 * 1000);
  if (recent.length >= 10) throw new ApiError(429, "Terlalu banyak kiriman. Coba lagi beberapa saat.");
  recent.push(now);
  recentPosts.set(address, recent);
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return json({ error: "Metode tidak didukung." }, 405);
  }

  try {
    checkRateLimit(request);
    const payload = await request.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new ApiError(400, "Data tautan tidak valid.");
    }

    const video = await resolveSocialVideo(payload);
    video.createdAt = new Date().toISOString();
    await put(`videos/records/${video.id}.json`, JSON.stringify(video), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false
    });

    return json(video, 201);
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status);
    console.error("Could not save social video to Vercel Blob:", error);
    return json({ error: "Video gagal disimpan. Pastikan Vercel Blob sudah terhubung." }, 500);
  }
}
