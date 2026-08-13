(function () {
  const PW_KEY = "novelAdminPw";

  const gateView = document.getElementById("gateView");
  const gateForm = document.getElementById("gateForm");
  const gatePasswordInput = document.getElementById("gatePasswordInput");
  const gateError = document.getElementById("gateError");

  const adminShell = document.getElementById("adminShell");
  const lockBtn = document.getElementById("lockBtn");

  const titleInput = document.getElementById("titleInput");
  const authorInput = document.getElementById("authorInput");
  const synopsisInput = document.getElementById("synopsisInput");

  const chapterListEl = document.getElementById("chapterListEl");
  const addChapterBtn = document.getElementById("addChapterBtn");
  const discardBtn = document.getElementById("discardBtn");
  const refreshAdminBtn = document.getElementById("refreshAdminBtn");
  const saveBtn = document.getElementById("saveBtn");
  const dirtyBadge = document.getElementById("dirtyBadge");

  const modalOverlay = document.getElementById("modalOverlay");
  const modalHeading = document.getElementById("modalHeading");
  const modalTitleInput = document.getElementById("modalTitleInput");
  const modalContentTextarea = document.getElementById("modalContentTextarea");
  const modalSaveBtn = document.getElementById("modalSaveBtn");
  const modalCancelBtn = document.getElementById("modalCancelBtn");
  const previewToggleBtn = document.getElementById("previewToggleBtn");
  const previewBox = document.getElementById("previewBox");

  const toastRoot = document.getElementById("toastRoot");

  let novel = null;
  let snapshot = null;
  let dirty = false;
  let editingChapterId = null; // null = membuat bab baru

  function toast(msg, isErr) {
    const el = document.createElement("div");
    el.className = "toast" + (isErr ? " err" : "");
    el.textContent = msg;
    toastRoot.appendChild(el);
    setTimeout(() => el.remove(), 3400);
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function markDirty() {
    dirty = true;
    dirtyBadge.style.display = "inline-flex";
  }

  function clearDirty() {
    dirty = false;
    dirtyBadge.style.display = "none";
  }

  // ---------- gerbang kata sandi ----------

  function showGate(message) {
    adminShell.style.display = "none";
    gateView.style.display = "flex";
    if (message) {
      gateError.textContent = message;
      gateError.style.display = "block";
    } else {
      gateError.style.display = "none";
    }
    gatePasswordInput.value = "";
    gatePasswordInput.focus();
  }

  function showDashboard() {
    gateView.style.display = "none";
    adminShell.style.display = "block";
  }

  gateForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const pw = gatePasswordInput.value;
    if (!pw) return;
    sessionStorage.setItem(PW_KEY, pw);
    showDashboard();
    loadData();
  });

  lockBtn.addEventListener("click", () => {
    sessionStorage.removeItem(PW_KEY);
    novel = null;
    snapshot = null;
    clearDirty();
    showGate();
  });

  // ---------- muat & simpan data ----------

  async function loadData() {
    try {
      const res = await fetch("/api/novel", { cache: "no-store" });
      if (!res.ok) throw new Error("bad status");
      novel = await res.json();
      snapshot = clone(novel);
      clearDirty();
      renderAll();
    } catch (e) {
      toast("Gagal memuat data. Pastikan situs sudah di-deploy ke Netlify.", true);
    }
  }

  async function saveAll() {
    const password = sessionStorage.getItem(PW_KEY) || "";
    saveBtn.disabled = true;
    saveBtn.textContent = "Menyimpan…";
    try {
      const res = await fetch("/api/novel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, data: novel }),
      });
      const body = await res.json().catch(() => ({}));

      if (res.status === 401) {
        sessionStorage.removeItem(PW_KEY);
        showGate("Kata sandi salah. Coba lagi.");
        return;
      }
      if (!res.ok) {
        toast(body.error || "Gagal menyimpan perubahan.", true);
        return;
      }

      novel = body;
      snapshot = clone(novel);
      clearDirty();
      renderAll();
      toast("Perubahan tersimpan & terbit ke semua perangkat.");
    } catch (e) {
      toast("Gagal terhubung ke server. Periksa koneksi internet.", true);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Simpan & Terbitkan";
    }
  }

  refreshAdminBtn.addEventListener("click", () => {
    if (dirty && !confirm("Ada perubahan belum disimpan. Muat ulang dan buang perubahan itu?")) {
      return;
    }
    loadData();
  });

  discardBtn.addEventListener("click", () => {
    if (!dirty) return;
    if (!confirm("Batalkan semua perubahan yang belum disimpan?")) return;
    novel = clone(snapshot);
    clearDirty();
    renderAll();
  });

  saveBtn.addEventListener("click", saveAll);

  // ---------- render ----------

  function renderAll() {
    titleInput.value = novel.title || "";
    authorInput.value = novel.author || "";
    synopsisInput.value = novel.synopsis || "";
    renderChapterList();
  }

  [titleInput, authorInput, synopsisInput].forEach((el) => {
    el.addEventListener("input", () => {
      novel.title = titleInput.value;
      novel.author = authorInput.value;
      novel.synopsis = synopsisInput.value;
      markDirty();
    });
  });

  function renderChapterList() {
    const chapters = novel.chapters || [];
    if (!chapters.length) {
      chapterListEl.innerHTML = `<div class="empty-state" style="padding:36px 0"><h3>Belum ada bab</h3><p>Klik "+ Tambah Bab" untuk mulai menulis.</p></div>`;
      return;
    }

    chapterListEl.innerHTML = chapters
      .map((ch, i) => {
        const words = wordCount(ch.content);
        return `
        <div class="chapter-row" data-id="${escapeHtml(ch.id)}">
          <div class="reorder">
            <button data-act="up" data-id="${escapeHtml(ch.id)}" ${i === 0 ? "disabled" : ""} title="Naikkan">▲</button>
            <button data-act="down" data-id="${escapeHtml(ch.id)}" ${i === chapters.length - 1 ? "disabled" : ""} title="Turunkan">▼</button>
          </div>
          <div class="info">
            <p class="t">Bab ${i + 1} — ${escapeHtml(ch.title || "Tanpa Judul")}</p>
            <p class="m">${words} kata${ch.updatedAt ? " · diperbarui " + formatDate(ch.updatedAt) : ""}</p>
          </div>
          <div class="actions">
            <button class="btn btn-ghost" data-act="edit" data-id="${escapeHtml(ch.id)}">Sunting</button>
            <button class="btn btn-danger" data-act="delete" data-id="${escapeHtml(ch.id)}">Hapus</button>
          </div>
        </div>`;
      })
      .join("");

    chapterListEl.querySelectorAll("[data-act]").forEach((btn) => {
      btn.addEventListener("click", () => onChapterAction(btn.dataset.act, btn.dataset.id));
    });
  }

  function onChapterAction(act, id) {
    const chapters = novel.chapters;
    const idx = chapters.findIndex((c) => c.id === id);
    if (idx === -1) return;

    if (act === "up" && idx > 0) {
      [chapters[idx - 1], chapters[idx]] = [chapters[idx], chapters[idx - 1]];
      markDirty();
      renderChapterList();
    } else if (act === "down" && idx < chapters.length - 1) {
      [chapters[idx + 1], chapters[idx]] = [chapters[idx], chapters[idx + 1]];
      markDirty();
      renderChapterList();
    } else if (act === "edit") {
      openEditor(chapters[idx]);
    } else if (act === "delete") {
      if (confirm(`Hapus "${chapters[idx].title || "bab ini"}"? Tindakan ini tidak bisa dibatalkan setelah disimpan.`)) {
        chapters.splice(idx, 1);
        markDirty();
        renderChapterList();
      }
    }
  }

  // ---------- modal editor bab ----------

  function openEditor(chapter) {
    editingChapterId = chapter ? chapter.id : null;
    modalHeading.textContent = chapter ? "Sunting Bab" : "Bab Baru";
    modalTitleInput.value = chapter ? chapter.title : "";
    modalContentTextarea.value = chapter ? chapter.content : "";
    previewBox.style.display = "none";
    previewBox.innerHTML = "";
    previewToggleBtn.textContent = "Pratinjau";
    modalOverlay.style.display = "flex";
    modalTitleInput.focus();
  }

  function closeEditor() {
    modalOverlay.style.display = "none";
    editingChapterId = null;
  }

  addChapterBtn.addEventListener("click", () => openEditor(null));
  modalCancelBtn.addEventListener("click", closeEditor);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeEditor();
  });

  previewToggleBtn.addEventListener("click", () => {
    const showing = previewBox.style.display !== "none";
    if (showing) {
      previewBox.style.display = "none";
      previewToggleBtn.textContent = "Pratinjau";
    } else {
      previewBox.innerHTML = renderChapterContent(modalContentTextarea.value);
      previewBox.style.display = "block";
      previewToggleBtn.textContent = "Sembunyikan Pratinjau";
    }
  });

  modalSaveBtn.addEventListener("click", () => {
    const title = modalTitleInput.value.trim();
    const content = modalContentTextarea.value;
    if (!title) {
      toast("Judul bab tidak boleh kosong.", true);
      modalTitleInput.focus();
      return;
    }

    if (editingChapterId) {
      const ch = novel.chapters.find((c) => c.id === editingChapterId);
      ch.title = title;
      ch.content = content;
      ch.updatedAt = new Date().toISOString();
    } else {
      novel.chapters.push({
        id: crypto.randomUUID(),
        title,
        content,
        updatedAt: new Date().toISOString(),
      });
    }

    markDirty();
    renderChapterList();
    closeEditor();
  });

  // ---------- mulai ----------

  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  const storedPw = sessionStorage.getItem(PW_KEY);
  if (storedPw) {
    showDashboard();
    loadData();
  } else {
    showGate();
  }
})();
