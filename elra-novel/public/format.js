// Kumpulan fungsi kecil yang dipakai bersama oleh halaman baca & halaman kelola.

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

// Mengubah teks polos jadi HTML aman: baris kosong = paragraf baru,
// **tebal**, *miring*, dan baris berisi --- jadi pembatas adegan.
function renderChapterContent(raw) {
  const text = (raw || "").trim();
  if (!text) return '<p class="muted">Bab ini belum ada isinya.</p>';

  const blocks = text.split(/\n\s*\n/);
  return blocks
    .map((block) => {
      const trimmed = block.trim();
      if (/^-{3,}$/.test(trimmed)) {
        return '<div class="scene-break" aria-hidden="true">✦ ✦ ✦</div>';
      }
      const html = escapeHtml(trimmed)
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/\n/g, "<br>");
      return `<p>${html}</p>`;
    })
    .join("\n");
}

function wordCount(raw) {
  const text = (raw || "").trim();
  if (!text) return 0;
  return text.split(/\s+/).length;
}

function estimateReadMinutes(raw) {
  const words = wordCount(raw);
  return Math.max(1, Math.round(words / 200));
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function toRoman(num) {
  const map = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let n = num;
  let out = "";
  for (const [value, symbol] of map) {
    while (n >= value) {
      out += symbol;
      n -= value;
    }
  }
  return out || String(num);
}
