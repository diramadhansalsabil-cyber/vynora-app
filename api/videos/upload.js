import { handleUpload } from "@vercel/blob/client";

const maxVideoBytes = 50 * 1024 * 1024;
const maxCoverBytes = 512 * 1024;
const tokenRequests = new Map();
const uploadIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function checkTokenRateLimit(request) {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  if (tokenRequests.size > 5000) {
    for (const [knownAddress, timestamps] of tokenRequests) {
      if (timestamps.every((time) => now - time >= 10 * 60 * 1000)) tokenRequests.delete(knownAddress);
    }
  }
  const recent = (tokenRequests.get(address) || []).filter((time) => now - time < 10 * 60 * 1000);
  if (recent.length >= 20) {
    const error = new Error("Terlalu banyak permintaan unggahan. Coba lagi beberapa saat.");
    error.status = 429;
    throw error;
  }
  recent.push(now);
  tokenRequests.set(address, recent);
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return Response.json({ error: "Metode tidak didukung." }, { status: 405 });
  }

  try {
    const body = await request.json();
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        checkTokenRateLimit(request);

        let payload;
        try {
          payload = JSON.parse(clientPayload || "");
        } catch {
          throw new Error("Data unggahan tidak valid.");
        }

        const isVideo = payload?.kind === "video";
        const isCover = payload?.kind === "cover";
        if (!uploadIdPattern.test(payload?.uploadId || "")
          || (!isVideo && !isCover)
          || pathname !== `uploads/${payload.uploadId}-${payload.kind}.${isVideo ? "mp4" : "jpg"}`) {
          throw new Error("Tujuan unggahan tidak valid.");
        }

        return {
          allowedContentTypes: [isVideo ? "video/mp4" : "image/jpeg"],
          maximumSizeInBytes: isVideo ? maxVideoBytes : maxCoverBytes,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ uploadId: payload.uploadId, kind: payload.kind })
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        if (!tokenPayload) throw new Error("Data unggahan tidak tersedia.");
        const payload = JSON.parse(tokenPayload);
        const expectedPath = `uploads/${payload.uploadId}-${payload.kind}.${payload.kind === "video" ? "mp4" : "jpg"}`;
        if (!uploadIdPattern.test(payload.uploadId) || blob.pathname !== expectedPath) {
          throw new Error("Berkas unggahan tidak sesuai.");
        }
      }
    });

    return Response.json(result);
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 400;
    if (status >= 500) console.error("Vercel Blob client upload failed:", error);
    return Response.json({ error: error.message || "Unggahan gagal." }, { status });
  }
}
