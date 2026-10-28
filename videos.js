import { list } from "@vercel/blob";

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

async function getAllVideoRecords() {
  const records = [];
  let cursor;

  do {
    const page = await list({ prefix: "videos/records/", limit: 1000, cursor });
    records.push(...page.blobs.filter((blob) => blob.pathname.endsWith(".json")));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  const videos = [];
  for (let offset = 0; offset < records.length; offset += 40) {
    const batch = await Promise.all(records.slice(offset, offset + 40).map(async (blob) => {
      const response = await fetch(blob.url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Could not read video record ${blob.pathname}.`);
      return response.json();
    }));
    videos.push(...batch);
  }

  return videos.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

export default async function handler(request) {
  if (request.method !== "GET") {
    return json({ error: "Metode tidak didukung." }, 405);
  }

  try {
    return json(await getAllVideoRecords());
  } catch (error) {
    console.error("Could not load Vercel Blob video records:", error);
    return json({ error: "Daftar video gagal dimuat. Pastikan Vercel Blob sudah terhubung." }, 500);
  }
}
