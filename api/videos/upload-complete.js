import { randomUUID } from "node:crypto";
import { head, put } from "@vercel/blob";

const maxVideoBytes = 50 * 1024 * 1024;
const maxCoverBytes = 512 * 1024;
const categories = new Set(["film", "drama", "komedi", "musik", "edukasi", "olahraga", "lainnya"]);
const uploadIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const completedUploadsByAddress = new Map();

function cleanText(value, fallback, maxLength) {
  if (typeof value !== "string") return fallback;
  const text = value.trim().replace(/\s+/g, " ");
  return text ? text.slice(0, maxLength) : fallback;
}

function isPublicBlobUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
}

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

function checkRateLimit(request) {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  if (completedUploadsByAddress.size > 5000) {
    for (const [knownAddress, timestamps] of completedUploadsByAddress) {
      if (timestamps.every((time) => now - time >= 10 * 60 * 1000)) completedUploadsByAddress.delete(knownAddress);
    }
  }
  const recent = (completedUploadsByAddress.get(address) || []).filter((time) => now - time < 10 * 60 * 1000);
  if (recent.length >= 10) return false;
  recent.push(now);
  completedUploadsByAddress.set(address, recent);
  return true;
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return json({ error: "Metode tidak didukung." }, 405);
  }

  try {
    if (!checkRateLimit(request)) {
      return json({ error: "Terlalu banyak unggahan. Coba lagi beberapa saat." }, 429);
    }
    const payload = await request.json();
    if (!payload || !uploadIdPattern.test(payload.uploadId || "")
      || !isPublicBlobUrl(payload.videoUrl)
      || !isPublicBlobUrl(payload.thumbnailUrl)) {
      return json({ error: "Data unggahan tidak valid." }, 400);
    }

    const [videoBlob, coverBlob] = await Promise.all([
      head(payload.videoUrl),
      head(payload.thumbnailUrl)
    ]);
    if (videoBlob.pathname !== `uploads/${payload.uploadId}-video.mp4`
      || videoBlob.contentType !== "video/mp4"
      || videoBlob.size > maxVideoBytes
      || coverBlob.pathname !== `uploads/${payload.uploadId}-cover.jpg`
      || coverBlob.contentType !== "image/jpeg"
      || coverBlob.size > maxCoverBytes) {
      return json({ error: "Video atau sampul tidak lolos pemeriksaan." }, 415);
    }

    const contentCategory = categories.has(payload.contentCategory) ? payload.contentCategory : "lainnya";
    const id = randomUUID();
    const video = {
      id,
      type: "mp4",
      title: cleanText(payload.title, "Video baru", 100),
      channel: cleanText(payload.channel, "Video komunitas", 60),
      views: "Video lokal",
      date: "MP4",
      likes: "—",
      category: "local",
      contentCategory,
      caption: cleanText(payload.caption, `Video ${contentCategory} dari komunitas.`, 300),
      src: videoBlob.url,
      downloadUrl: videoBlob.downloadUrl,
      thumbnail: coverBlob.url,
      avatar: "/vynora-mark.png",
      description: "Video MP4 yang diunggah ke VynoraApp.",
      createdAt: new Date().toISOString()
    };

    await put(`videos/records/${id}.json`, JSON.stringify(video), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false
    });

    return json(video, 201);
  } catch (error) {
    console.error("Could not finalize Vercel Blob video upload:", error);
    return json({ error: "Video gagal disimpan. Periksa konfigurasi Vercel Blob." }, 500);
  }
}
