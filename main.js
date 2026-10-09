// Ссылки на файлы в чатах → папка с выделенным файлом (Finder на Mac, Проводник на Windows): картинки, видео, проекты
// After Effects и прочее. Текст и код (.md, .txt, .json, .py…) — как раньше, в «Файлах» хаба. Только на компьютере
// хаба: окно открывается на его экране; с телефона и по ⌘/Ctrl-клику ссылка открывается в «Файлах».
const LOCAL = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(location.hostname);
const MAC = /Mac/i.test(navigator.platform || navigator.userAgent);
const WHERE = MAC ? "Finder" : "Проводнике";
// текст — читать в хабе; файл без расширения (Makefile, Dockerfile, LICENSE) — тоже текст
const TEXT = new Set(("md markdown mdx txt text rst log csv tsv json jsonl ndjson yaml yml toml ini cfg conf env xml " +
  "html htm css scss less js mjs cjs ts tsx jsx vue svelte py rb go rs java kt swift c h cc cpp hpp cs php sh bash zsh " +
  "fish ps1 bat cmd sql graphql proto lua r pl diff patch gitignore editorconfig").split(" "));
const isText = (path) => {
  const name = path.replace(/[\\/]+$/, "").split(/[\\/]/).pop();
  const dot = name.lastIndexOf(".");
  return dot < 0 ? !!name : TEXT.has(name.slice(dot + 1).toLowerCase());
};

// ссылка → { path, cwd } или null: адрес «Файлов» /open?path=… или file:///…
function target(a, snap) {
  let u;
  try { u = new URL(a.href, location.href); } catch { return null; }
  if (u.protocol === "file:") {
    const path = decodeURIComponent(u.pathname).replace(/^\/([A-Za-z]:)/, "$1");
    // текст по file:/// — в «Файлы» (браузер со страницы хаба file:/// не открывает)
    const files = `${location.protocol}//${location.hostname}:${snap?.files_port || 8788}/open?path=${encodeURIComponent(path)}`;
    return isText(path) ? { open: files } : { path, cwd: "", files };
  }
  const port = String(snap?.files_port || 8788);
  if (u.pathname !== "/open" || u.port !== port || !u.searchParams.get("path")) return null;
  if (isText(u.searchParams.get("path"))) return null;   // текст — в «Файлах», как без плагина
  let cwd = u.searchParams.get("cwd") || "";
  const session = u.searchParams.get("session");
  if (!cwd && session) cwd = (snap?.sessions || []).find((s) => s.name === session)?.cwd || "";
  return { path: u.searchParams.get("path"), cwd };
}

export default function register(hub) {
  if (!LOCAL) return;
  document.addEventListener("mouseover", (e) => {
    const a = e.target.closest?.("a[href]");
    if (a && !a.dataset.reveal && target(a, hub.snapshot())?.path) {
      a.dataset.reveal = "1";
      a.title = `Показать в ${WHERE} (${MAC ? "⌘" : "Ctrl"}-клик — в «Файлах»)`;
    }
  }, true);
  document.addEventListener("click", async (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest?.("a[href]");
    const t = a && target(a, hub.snapshot());
    if (!t) return;
    e.preventDefault();
    e.stopPropagation();
    if (t.open) return void window.open(t.open, "_blank", "noopener");
    const href = t.files || a.href;
    const r = await hub.post("/api/reveal", { path: t.path, cwd: t.cwd });
    if (r.error) window.open(href, "_blank", "noopener");   // не нашёлся или хаб без /api/reveal — как раньше
  }, true);
}
