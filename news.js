/* WORLD DOMINION V.I — NEWS FEED + KORAN PRIBADI (Build 0.9 fix)
   Store lokal: wdNews (umpan berita dunia), wdArticles (koran pribadi).
   API: window.WDNews = { add(title, body, tag), load(), syncFoundings(), renderFeed() }
   Halaman lain memanggil WDNews.add() saat pemain melakukan hal penting.
*/
window.WDNews = (function () {
  "use strict";
  const KEY = "wdNews";
  const AKEY = "wdArticles";
  const SEED = [
    { title: "Dunia baru dimulai", body: "World Dominion V.I resmi dibuka. Dunia dimulai dari nol: belum ada negara, penduduk, perusahaan, atau infrastruktur. Semuanya tumbuh dari tindakan para pemain.", tag: "Redaksi", at: Date.UTC(2026, 10, 16, 9, 0, 0) },
    { title: "Peta provinsi sedang dibangun", body: "Tim pemetaan menyiapkan 789 provinsi dari data Natural Earth. Buka Peta Dunia dan klik \u201CBangun peta provinsi\u201D untuk mengunduh dan membangun peta di perangkatmu.", tag: "Redaksi", at: Date.UTC(2026, 10, 16, 12, 0, 0) },
    { title: "Indonesia dibuka sebagai wilayah pertama", body: "Untuk tahap awal, hanya provinsi-provinsi Indonesia yang terbuka untuk ditempati dan dijelajahi. Wilayah lain masih terkunci dan akan dibuka bertahap.", tag: "Redaksi", at: Date.UTC(2026, 10, 16, 12, 30, 0) }
  ];

  function load() {
    const items = WD.load(KEY, null);
    if (!Array.isArray(items)) { WD.save(KEY, SEED.slice()); return SEED.slice(); }
    return items;
  }
  function persist(items) { WD.save(KEY, items); }

  function add(title, body, tag) {
    const items = load();
    items.push({ title: String(title || "").slice(0, 120), body: String(body || "").slice(0, 1000), tag: tag || "Pemain", at: Date.now() });
    persist(items);
    if (document.getElementById("news-list")) renderFeed();
  }

  // Berita otomatis untuk negara yang didirikan pemain tapi belum punya entri.
  function syncFoundings() {
    let countries = {};
    try { countries = Game.getCountries() || {}; } catch (e) { return; }
    const items = load(); let changed = false;
    Object.values(countries).forEach(c => {
      const marker = "NEGARA:" + c.id;
      if (items.some(it => it.marker === marker)) return;
      items.push({ title: "Negara baru didirikan: " + c.name, body: (c.founder || "Seorang pemain") + " mendirikan negara " + c.name + " dan menjadi pendirinya.", tag: "Pemain", at: c.foundedAt || Date.now(), marker });
      changed = true;
    });
    if (changed) persist(items);
  }

  function renderFeed() {
    const el = document.getElementById("news-list"); if (!el) return;
    const items = load().slice().sort((a, b) => (b.at || 0) - (a.at || 0));
    const stat = document.getElementById("stat-news"); if (stat) stat.textContent = items.length;
    if (!items.length) { el.innerHTML = '<p class="muted">Belum ada berita.</p>'; return; }
    el.innerHTML = items.map(it =>
      '<article class="wd-news-item"><h3>' + WD.esc(it.title) + '</h3><p>' + WD.esc(it.body) + '</p>' +
      '<div class="wd-news-meta">' + WD.esc(it.tag || "Redaksi") + ' \u00B7 ' + WD.fmtDate(it.at) + '</div></article>'
    ).join("");
  }

  // ---- Koran Pribadi (my-newspaper.html) ----
  function loadArticles() { const v = WD.load(AKEY, []); return Array.isArray(v) ? v : []; }
  function saveArticles(v) { WD.save(AKEY, v); }

  function renderArticles() {
    const el = document.getElementById("articles-list"); if (!el) return;
    const items = loadArticles().slice().sort((a, b) => (b.at || 0) - (a.at || 0));
    const stat = document.getElementById("stat-articles"); if (stat) stat.textContent = items.length;
    if (!items.length) { el.innerHTML = '<p class="muted">Belum ada artikel. Tulis artikel pertamamu di atas.</p>'; return; }
    const me = Game.getPlayer().username;
    el.innerHTML = items.map(a =>
      '<article class="wd-news-item"><h3>' + WD.esc(a.title) + '</h3><p>' + WD.esc(a.body) + '</p>' +
      '<div class="wd-news-meta">Oleh ' + WD.esc(a.author) + ' \u00B7 ' + WD.fmtDate(a.at) + '</div>' +
      (a.author === me ? '<div class="wd-actions top-gap"><button class="subtle-button" type="button" data-del-article="' + a.id + '">Hapus artikel</button></div>' : '') +
      '</article>'
    ).join("");
    WD.$$("[data-del-article]", el).forEach(btn => btn.addEventListener("click", () => {
      saveArticles(loadArticles().filter(a => a.id !== btn.getAttribute("data-del-article")));
      WD.toast("Artikel dihapus."); renderArticles();
    }));
  }

  function initNewspaper() {
    const form = document.getElementById("article-form"); if (!form) return;
    renderArticles();
    form.addEventListener("submit", ev => {
      ev.preventDefault();
      const title = document.getElementById("art-title").value.trim();
      const body = document.getElementById("art-body").value.trim();
      if (!title || !body) { WD.toast("Judul dan isi artikel wajib diisi."); return; }
      const items = loadArticles();
      items.push({ id: WD.uid("art"), title: title.slice(0, 120), body: body.slice(0, 4000), author: Game.getPlayer().username, at: Date.now() });
      saveArticles(items);
      form.reset(); renderArticles();
      WD.toast("Artikel diterbitkan di koran pribadimu.");
      add("Artikel baru: " + title, Game.getPlayer().username + " menerbitkan artikel \u201C" + title + "\u201D di koran pribadinya.", "Pers");
    });
  }

  function initNewsPage() {
    if (!document.getElementById("news-list")) return;
    const p = Game.getPlayer();
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set("domain-player", p.username); set("domain-level", p.level);
    set("domain-gold", WD.fmt(p.gold)); set("domain-energy", Math.floor(p.energy) + " / " + p.maxEnergy);
    renderFeed();
  }

  document.addEventListener("DOMContentLoaded", () => { initNewsPage(); initNewspaper(); });

  return { add, load, syncFoundings, renderFeed };
})();
