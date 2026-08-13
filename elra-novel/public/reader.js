(function () {
  const app = document.getElementById("app");
  const progressBar = document.getElementById("progressBar");
  const lastUpdatedEl = document.getElementById("lastUpdated");
  const refreshBtn = document.getElementById("refreshBtn");
  const toastRoot = document.getElementById("toastRoot");

  let novel = null;
  let loadError = false;

  const PREFS_KEY = "novelReaderPrefs";
  function loadPrefs() {
    try {
      return Object.assign(
        { theme: "dark", fontSize: 19 },
        JSON.parse(localStorage.getItem(PREFS_KEY) || "{}")
      );
    } catch {
      return { theme: "dark", fontSize: 19 };
    }
  }
  function savePrefs(p) {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  }
  let prefs = loadPrefs();

  function toast(msg, isErr) {
    const el = document.createElement("div");
    el.className = "toast" + (isErr ? " err" : "");
    el.textContent = msg;
    toastRoot.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  async function loadData(announce) {
    try {
      const res = await fetch("/api/novel", { cache: "no-store" });
      if (!res.ok) throw new Error("bad status");
      novel = await res.json();
      loadError = false;
      render();
      if (announce) toast("Data terbaru dimuat.");
    } catch (e) {
      loadError = true;
      render();
    }
  }

  function currentHash() {
    return window.location.hash || "#/";
  }

  function getChapterIdFromHash() {
    const m = currentHash().match(/^#\/bab\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function render() {
    if (loadError && !novel) {
      app.innerHTML = `
        <div class="state-msg error">
          <p>Tidak bisa memuat novel.</p>
          <p class="hint">Pastikan situs ini sudah di-deploy ke Netlify (bukan dibuka langsung sebagai file), lalu coba segarkan halaman.</p>
        </div>`;
      lastUpdatedEl.textContent = "";
      progressBar.style.width = "0%";
      return;
    }
    if (!novel) {
      app.innerHTML = `<div class="state-msg">Memuat novel…</div>`;
      return;
    }

    lastUpdatedEl.textContent = novel.updatedAt
      ? "Diperbarui " + formatDate(novel.updatedAt)
      : "";

    const chapterId = getChapterIdFromHash();
    if (chapterId) {
      renderChapter(chapterId);
    } else {
      renderHome();
    }
  }

  function renderHome() {
    progressBar.style.width = "0%";
    document.title = novel.title || "Baca Novel";

    const chapters = novel.chapters || [];
    const tocRows = chapters.length
      ? chapters
          .map((ch, i) => {
            const mins = estimateReadMinutes(ch.content);
            return `
            <li class="toc-row" data-id="${escapeHtml(ch.id)}">
              <span class="toc-num">${toRoman(i + 1)}</span>
              <div class="toc-body">
                <p class="toc-title">${escapeHtml(ch.title || "Tanpa Judul")}</p>
                <p class="toc-meta">${mins} menit baca${
                  ch.updatedAt ? " · " + formatDate(ch.updatedAt) : ""
                }</p>
              </div>
            </li>`;
          })
          .join("")
      : `<li class="empty-state"><h3>Belum ada bab</h3><p>Bab pertama akan muncul di sini setelah dipublikasikan lewat halaman Kelola.</p></li>`;

    app.innerHTML = `
      <section class="hero">
        <p class="hero-eyebrow">${
          chapters.length
            ? chapters.length + (chapters.length === 1 ? " bab" : " bab")
            : "Segera hadir"
        }</p>
        <h1>${escapeHtml(novel.title || "Judul Novelmu")}</h1>
        ${novel.author ? `<p class="author">oleh ${escapeHtml(novel.author)}</p>` : ""}
        <p class="synopsis">${escapeHtml(novel.synopsis || "")}</p>
        ${
          chapters.length
            ? `<a class="btn btn-primary" href="#/bab/${encodeURIComponent(chapters[0].id)}">Mulai Membaca</a>`
            : ""
        }
      </section>
      <section class="toc">
        <h2 class="toc-heading">Daftar Isi</h2>
        <p class="toc-sub">Ikuti ceritanya dari bab ke bab.</p>
        <ul class="toc-list">${tocRows}</ul>
      </section>
    `;

    app.querySelectorAll(".toc-row[data-id]").forEach((row) => {
      row.addEventListener("click", () => {
        window.location.hash = "#/bab/" + encodeURIComponent(row.dataset.id);
      });
    });
  }

  function renderChapter(id) {
    const chapters = novel.chapters || [];
    const idx = chapters.findIndex((c) => c.id === id);
    if (idx === -1) {
      app.innerHTML = `
        <div class="state-msg">
          <p>Bab tidak ditemukan.</p>
          <p class="hint"><a href="#/" class="btn btn-ghost" style="margin-top:14px;display:inline-flex">← Kembali ke Daftar Isi</a></p>
        </div>`;
      return;
    }

    const ch = chapters[idx];
    document.title = (ch.title || "Bab") + " — " + (novel.title || "Novel");

    app.innerHTML = `
      <div class="reader" data-theme="${prefs.theme}" style="--reading-size:${prefs.fontSize}px">
        <div class="reader-topbar">
          <a href="#/" class="btn btn-ghost">← Daftar Isi</a>
          <div class="reader-tools">
            <button class="btn-icon" data-act="font-minus" title="Perkecil huruf">A−</button>
            <button class="btn-icon" data-act="font-plus" title="Perbesar huruf">A+</button>
            <button class="btn-icon" data-act="theme-light" title="Tema terang">☀</button>
            <button class="btn-icon" data-act="theme-sepia" title="Tema sepia">◐</button>
            <button class="btn-icon" data-act="theme-dark" title="Tema gelap">☾</button>
          </div>
        </div>
        <div class="chapter-head">
          <p class="eyebrow">Bab ${toRoman(idx + 1)} dari ${chapters.length}</p>
          <h2>${escapeHtml(ch.title || "Tanpa Judul")}</h2>
          <p class="chapter-meta">${estimateReadMinutes(ch.content)} menit baca${
      ch.updatedAt ? " · " + formatDate(ch.updatedAt) : ""
    }</p>
        </div>
        <div class="chapter-body">${renderChapterContent(ch.content)}</div>
        <nav class="chapter-nav">
          ${
            idx > 0
              ? `<a class="btn btn-ghost" href="#/bab/${encodeURIComponent(chapters[idx - 1].id)}">← Bab Sebelumnya</a>`
              : `<span></span>`
          }
          ${
            idx < chapters.length - 1
              ? `<a class="btn btn-ghost" href="#/bab/${encodeURIComponent(chapters[idx + 1].id)}">Bab Selanjutnya →</a>`
              : `<a class="btn btn-ghost" href="#/">Kembali ke Awal</a>`
          }
        </nav>
      </div>
    `;

    window.scrollTo({ top: 0 });
    updateProgress();

    const readerEl = app.querySelector(".reader");
    readerEl.querySelectorAll("[data-act]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const act = btn.dataset.act;
        if (act === "font-minus") prefs.fontSize = Math.max(14, prefs.fontSize - 2);
        if (act === "font-plus") prefs.fontSize = Math.min(28, prefs.fontSize + 2);
        if (act === "theme-light") prefs.theme = "light";
        if (act === "theme-sepia") prefs.theme = "sepia";
        if (act === "theme-dark") prefs.theme = "dark";
        savePrefs(prefs);
        readerEl.dataset.theme = prefs.theme;
        readerEl.style.setProperty("--reading-size", prefs.fontSize + "px");
      });
    });
  }

  function updateProgress() {
    const onChapter = !!getChapterIdFromHash();
    if (!onChapter) {
      progressBar.style.width = "0%";
      return;
    }
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - doc.clientHeight;
    const pct = scrollable > 0 ? Math.min(100, (window.scrollY / scrollable) * 100) : 0;
    progressBar.style.width = pct + "%";
  }

  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("hashchange", render);
  refreshBtn.addEventListener("click", () => loadData(true));

  // Sinkron lintas perangkat: muat ulang saat tab aktif kembali,
  // supaya bab baru yang di-publish dari HP lain langsung terlihat.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") loadData(false);
  });
  window.addEventListener("focus", () => loadData(false));

  loadData(false);
})();
