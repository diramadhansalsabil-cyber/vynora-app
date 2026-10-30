import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../../", import.meta.url));
const databasePath = path.join(rootDir, "data", "videos.json");
const uploadsDir = path.join(rootDir, "public", "uploads");
const maxUploadBytes = 50 * 1024 * 1024;
const maxUploadRequestBytes = maxUploadBytes + 1024 * 1024;
const requestsByAddress = new Map();
let saveQueue = Promise.resolve();
const socialHosts = {
  tiktok: new Set(["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vt.tiktok.com", "vm.tiktok.com"]),
  instagram: new Set(["instagram.com", "www.instagram.com", "m.instagram.com"]),
  youtube: new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]),
  facebook: new Set(["facebook.com", "www.facebook.com", "m.facebook.com", "fb.watch"]),
  vimeo: new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"])
};
const contentCategories = new Set(["film", "drama", "komedi", "musik", "edukasi", "olahraga", "lainnya"]);

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sendJson(response, status, data) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(data));
}

async function readRequestBody(request, limit) {
  const chunks = [];
  let length = 0;

  for await (const chunk of request) {
    length += chunk.length;
    if (length > limit) throw new ApiError(413, "Ukuran kiriman terlalu besar.");
    chunks.push(chunk);
  }

  return Buffer.concat(chunks, length);
}

function cleanText(value, fallback, maxLength) {
  if (typeof value !== "string") return fallback;
  const text = value.trim().replace(/\s+/g, " ");
  return text ? text.slice(0, maxLength) : fallback;
}

function cleanContentCategory(value) {
  return typeof value === "string" && contentCategories.has(value) ? value : "lainnya";
}

async function readVideos() {
  try {
    const data = await readFile(databasePath, "utf8");
    const videos = JSON.parse(data);
    if (!Array.isArray(videos)) throw new Error("Video database must be an array.");
    return videos;
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function persistVideo(video) {
  await mkdir(path.dirname(databasePath), { recursive: true });
  const videos = await readVideos();
  videos.push(video);
  const tempPath = `${databasePath}.${randomUUID()}.tmp`;
  await writeFile(tempPath, JSON.stringify(videos, null, 2), { flag: "wx" });
  await rename(tempPath, databasePath);
}

function saveVideo(video) {
  const pendingWrite = saveQueue.then(() => persistVideo(video));
  saveQueue = pendingWrite.catch(() => {});
  return pendingWrite;
}

async function updateVideo(videoId, update) {
  const pendingWrite = saveQueue.then(async () => {
    const videos = await readVideos();
    const index = videos.findIndex((video) => video.id === videoId);
    if (index < 0) throw new ApiError(404, "Video tidak ditemukan.");
    videos[index] = update(videos[index]);
    const tempPath = `${databasePath}.${randomUUID()}.tmp`;
    await writeFile(tempPath, JSON.stringify(videos, null, 2), { flag: "wx" });
    await rename(tempPath, databasePath);
    return videos[index];
  });
  saveQueue = pendingWrite.catch(() => {});
  return pendingWrite;
}

function checkRateLimit(request) {
  const address = request.socket.remoteAddress || "unknown";
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  if (requestsByAddress.size > 5000) {
    for (const [knownAddress, timestamps] of requestsByAddress) {
      if (timestamps.every((time) => now - time >= windowMs)) requestsByAddress.delete(knownAddress);
    }
  }
  const recent = (requestsByAddress.get(address) || []).filter((time) => now - time < windowMs);

  if (recent.length >= 10) throw new ApiError(429, "Terlalu banyak kiriman. Coba lagi beberapa saat.");
  recent.push(now);
  requestsByAddress.set(address, recent);
}

export async function resolveSocialVideo(payload) {
  if (typeof payload.url !== "string" || payload.url.length > 2048) {
    throw new ApiError(400, "Masukkan tautan video yang valid.");
  }

  let submittedUrl;
  try {
    submittedUrl = new URL(payload.url);
  } catch {
    throw new ApiError(400, "Masukkan tautan video yang valid.");
  }

  if (submittedUrl.protocol !== "https:" || submittedUrl.username || submittedUrl.password || submittedUrl.port) {
    throw new ApiError(400, "Tautan video harus menggunakan HTTPS.");
  }

  const providerEntry = Object.entries(socialHosts).find(([, hosts]) => hosts.has(submittedUrl.hostname));
  if (!providerEntry) {
    throw new ApiError(400, "Platform yang didukung: TikTok, Instagram, YouTube, Facebook, dan Vimeo.");
  }

  const [provider] = providerEntry;
  let embedUrl;
  let videoId;

  if (provider === "tiktok") {
    const oembedUrl = new URL("https://www.tiktok.com/oembed");
    oembedUrl.searchParams.set("url", submittedUrl.href);
    let metadata;
    try {
      const response = await fetch(oembedUrl, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`TikTok oEmbed returned ${response.status}`);
      metadata = await response.json();
    } catch (error) {
      console.error("TikTok link verification failed:", error);
      throw new ApiError(502, "Tautan TikTok tidak dapat diverifikasi. Coba lagi nanti.");
    }

    videoId = String(metadata.embed_product_id || "");
    if (!/^\d{10,25}$/.test(videoId)) {
      throw new ApiError(400, "Tautan tersebut tidak mengarah ke video TikTok yang dapat disematkan.");
    }
    embedUrl = `https://www.tiktok.com/player/v1/${videoId}?controls=1&autoplay=0&description=0&music_info=0`;
  } else if (provider === "youtube") {
    videoId = submittedUrl.hostname === "youtu.be"
      ? submittedUrl.pathname.split("/").filter(Boolean)[0]
      : submittedUrl.searchParams.get("v")
        || submittedUrl.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1];
    if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      throw new ApiError(400, "Tautan YouTube tidak berisi ID video yang valid.");
    }
    embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&rel=0`;
  } else if (provider === "instagram") {
    const match = submittedUrl.pathname.match(/^\/(reel|reels|p|tv)\/([A-Za-z0-9_-]+)/);
    if (!match) throw new ApiError(400, "Masukkan tautan Instagram Reel atau Post yang valid.");
    videoId = match[2];
    embedUrl = `https://www.instagram.com/${match[1] === "reels" ? "reel" : match[1]}/${videoId}/embed/`;
  } else if (provider === "facebook") {
    if (!submittedUrl.pathname || submittedUrl.pathname === "/") {
      throw new ApiError(400, "Masukkan tautan video atau postingan Facebook yang valid.");
    }
    videoId = submittedUrl.pathname;
    embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(submittedUrl.href)}&show_text=false`;
  } else {
    videoId = submittedUrl.pathname.match(/\/(\d+)(?:\/|$)/)?.[1];
    if (!videoId) throw new ApiError(400, "Tautan Vimeo tidak berisi ID video yang valid.");
    embedUrl = `https://player.vimeo.com/video/${videoId}`;
  }

  return {
    id: randomUUID(),
    type: provider,
    title: cleanText(payload.title, `Video ${provider}`, 100),
    channel: cleanText(payload.channel, provider === "youtube" ? "YouTube" : provider[0].toUpperCase() + provider.slice(1), 60),
    views: provider[0].toUpperCase() + provider.slice(1),
    date: "Video",
    likes: "—",
    category: provider,
    contentCategory: cleanContentCategory(payload.contentCategory),
    caption: cleanText(payload.caption, `Video ${cleanContentCategory(payload.contentCategory)} dari ${provider}.`, 300),
    videoId,
    tiktokId: provider === "tiktok" ? videoId : undefined,
    youtubeId: provider === "youtube" ? videoId : undefined,
    embedUrl,
    sourceUrl: submittedUrl.href,
    thumbnail: provider === "youtube" ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "",
    avatar: "/vynora-mark.png",
    description: `Video ${provider} yang ditambahkan oleh pengunjung.`
  };
}

async function addSocialVideo(request) {
  const rawBody = await readRequestBody(request, 8 * 1024);
  let payload;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    throw new ApiError(400, "Data tautan tidak valid.");
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ApiError(400, "Data tautan tidak valid.");
  }

  const video = await resolveSocialVideo(payload);
  await saveVideo(video);
  return video;
}

function parseMultipart(body, contentType) {
  const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.slice(1).find(Boolean)?.trim();
  if (!boundary || boundary.length > 200) throw new ApiError(400, "Form unggahan tidak valid.");
  const delimiter = Buffer.from(`--${boundary}`);
  const fields = new Map();
  let position = body.indexOf(delimiter);

  while (position !== -1) {
    position += delimiter.length;
    if (body.subarray(position, position + 2).toString() === "--") break;
    if (body.subarray(position, position + 2).toString() === "\r\n") position += 2;
    const headerEnd = body.indexOf(Buffer.from("\r\n\r\n"), position);
    if (headerEnd < 0) throw new ApiError(400, "Bagian form unggahan tidak valid.");
    const headerText = body.toString("utf8", position, headerEnd);
    const disposition = headerText.match(/content-disposition:\s*form-data;([^\r\n]+)/i)?.[1] || "";
    const fieldName = disposition.match(/(?:^|;)\s*name="([^"]+)"/i)?.[1];
    if (!fieldName) throw new ApiError(400, "Bagian form unggahan tidak valid.");

    const contentStart = headerEnd + 4;
    const nextDelimiter = body.indexOf(delimiter, contentStart);
    if (nextDelimiter < 0) throw new ApiError(400, "Form unggahan tidak lengkap.");
    const contentEnd = nextDelimiter >= 2 && body.subarray(nextDelimiter - 2, nextDelimiter).toString() === "\r\n"
      ? nextDelimiter - 2
      : nextDelimiter;
    fields.set(fieldName, {
      headers: headerText,
      body: body.subarray(contentStart, contentEnd)
    });
    position = nextDelimiter;
  }

  return fields;
}

async function addUploadedVideo(request) {
  const contentType = String(request.headers["content-type"] || "");
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    throw new ApiError(415, "Form unggahan video tidak valid.");
  }

  const declaredLength = Number(request.headers["content-length"]);
  if (Number.isFinite(declaredLength) && declaredLength > maxUploadRequestBytes) {
    throw new ApiError(413, "Ukuran video maksimum 50 MB.");
  }

  const fields = parseMultipart(await readRequestBody(request, maxUploadRequestBytes), contentType);
  const videoFile = fields.get("video");
  const thumbnailFile = fields.get("thumbnail");
  const videoBody = videoFile?.body;
  const thumbnailBody = thumbnailFile?.body;
  if (videoFile?.headers.toLowerCase().includes("content-type: video/mp4") !== true) {
    throw new ApiError(415, "Unggah file video MP4 saja.");
  }
  if (!videoBody || videoBody.length < 12 || videoBody.length > maxUploadBytes || videoBody.toString("ascii", 4, 8) !== "ftyp") {
    throw new ApiError(415, "File yang dipilih bukan video MP4 yang valid.");
  }
  if (!thumbnailFile?.headers.toLowerCase().includes("content-type: image/jpeg")
    || !thumbnailBody || thumbnailBody.length > 512 * 1024
    || thumbnailBody[0] !== 0xff || thumbnailBody[1] !== 0xd8) {
    throw new ApiError(415, "Sampul video dari frame pertama tidak valid.");
  }

  const title = cleanText(fields.get("title")?.body.toString("utf8"), "Video baru", 100);
  const channel = cleanText(fields.get("channel")?.body.toString("utf8"), "Video komunitas", 60);
  const contentCategory = cleanContentCategory(fields.get("contentCategory")?.body.toString("utf8"));
  const caption = cleanText(fields.get("caption")?.body.toString("utf8"), `Video ${contentCategory} dari ${channel}.`, 300);
  await mkdir(uploadsDir, { recursive: true });
  const id = randomUUID();
  const fileName = `${id}.mp4`;
  const filePath = path.join(uploadsDir, fileName);
  const thumbnailPath = path.join(uploadsDir, `${id}-cover.jpg`);
  await writeFile(filePath, videoBody, { flag: "wx" });
  try {
    await writeFile(thumbnailPath, thumbnailBody, { flag: "wx" });
  } catch (error) {
    await unlink(filePath).catch(() => {});
    throw error;
  }

  const video = {
    id,
    type: "mp4",
    title,
    channel,
    views: "Video lokal",
    date: "MP4",
    likes: "—",
    category: "local",
    contentCategory,
    caption,
    src: `/uploads/${fileName}`,
    thumbnail: `/uploads/${id}-cover.jpg`,
    avatar: "/vynora-mark.png",
    description: "Video MP4 yang diunggah ke VynoraApp."
  };

  try {
    await saveVideo(video);
  } catch (error) {
    await unlink(filePath).catch(() => {});
    await unlink(thumbnailPath).catch(() => {});
    throw error;
  }

  return video;
}

export async function handleVideoApi(request, response) {
  const requestUrl = new URL(request.url, "http://localhost");
  if (!requestUrl.pathname.startsWith("/api/videos")) return false;

  try {
    if (request.method === "GET" && requestUrl.pathname === "/api/videos") {
      sendJson(response, 200, await readVideos());
      return true;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/videos/tiktok") {
      checkRateLimit(request);
      sendJson(response, 201, await addSocialVideo(request));
      return true;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/videos/social") {
      checkRateLimit(request);
      sendJson(response, 201, await addSocialVideo(request));
      return true;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/videos/upload") {
      checkRateLimit(request);
      sendJson(response, 201, await addUploadedVideo(request));
      return true;
    }

    sendJson(response, 404, { error: "Endpoint tidak ditemukan." });
    return true;
  } catch (error) {
    if (error instanceof ApiError) {
      sendJson(response, error.status, { error: error.message });
      return true;
    }

    console.error("Video API error:", error);
    sendJson(response, 500, { error: "Terjadi kesalahan saat menyimpan video." });
    return true;
  }
}
