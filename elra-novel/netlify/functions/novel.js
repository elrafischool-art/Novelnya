import { getStore } from "@netlify/blobs";

// Ganti kata sandi di bawah ini kapan saja, lalu deploy ulang situsnya.
const ADMIN_PASSWORD = "aihcna123";

const STORE_NAME = "novel-data";
const RECORD_KEY = "main";

const DEFAULT_DATA = {
  title: "Judul Novelmu",
  author: "El",
  synopsis: "Tulis sinopsis singkat di sini lewat halaman Kelola.",
  chapters: [],
  updatedAt: null,
};

function json(body, status = 200) {
  const res = new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

function isValidChapter(ch) {
  return (
    ch &&
    typeof ch.id === "string" &&
    typeof ch.title === "string" &&
    typeof ch.content === "string"
  );
}

export default async (req) => {
  if (req.method === "OPTIONS") {
    return json({}, 204);
  }

  const store = getStore({ name: STORE_NAME, consistency: "strong" });

  if (req.method === "GET") {
    const data = await store.get(RECORD_KEY, { type: "json" });
    return json(data || DEFAULT_DATA);
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Isi permintaan tidak valid." }, 400);
    }

    if (typeof body.password !== "string" || body.password !== ADMIN_PASSWORD) {
      return json({ error: "Kata sandi salah." }, 401);
    }

    const incoming = body.data;
    if (
      !incoming ||
      typeof incoming.title !== "string" ||
      !Array.isArray(incoming.chapters) ||
      !incoming.chapters.every(isValidChapter)
    ) {
      return json({ error: "Data novel tidak lengkap atau formatnya salah." }, 400);
    }

    const toSave = {
      title: incoming.title.trim() || "Judul Novelmu",
      author: typeof incoming.author === "string" ? incoming.author.trim() : "",
      synopsis: typeof incoming.synopsis === "string" ? incoming.synopsis.trim() : "",
      chapters: incoming.chapters.map((ch) => ({
        id: ch.id,
        title: ch.title.trim() || "Tanpa Judul",
        content: ch.content,
        updatedAt: typeof ch.updatedAt === "string" ? ch.updatedAt : null,
      })),
      updatedAt: new Date().toISOString(),
    };

    await store.setJSON(RECORD_KEY, toSave);
    return json(toSave);
  }

  return json({ error: "Metode tidak didukung." }, 405);
};

export const config = {
  path: "/api/novel",
};
