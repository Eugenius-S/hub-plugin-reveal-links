// Ссылки на файлы в чатах: клик — файл в «Файлах» хаба, как без плагина; ⌘-клик (Ctrl-клик на Windows) — папка
// с выделенным файлом (Finder на Mac, Проводник на Windows). Только на компьютере хаба: окно открывается на его экране.
const LOCAL = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(location.hostname);
const MAC = /Mac/i.test(navigator.platform || navigator.userAgent);

// ссылка → { path, cwd, files } или null: адрес «Файлов» /open?path=… или file:///…
function target(a, snap) {
  let u;
  try { u = new URL(a.href, location.href); } catch { return null; }
  const port = String(snap?.files_port || 8788);
  if (u.protocol === "file:") {
    const path = decodeURIComponent(u.pathname).replace(/^\/([A-Za-z]:)/, "$1");
    return { path, cwd: "", files: `${location.protocol}//${location.hostname}:${port}/open?path=${encodeURIComponent(path)}` };
  }
  if (u.pathname !== "/open" || u.port !== port || !u.searchParams.get("path")) return null;
  let cwd = u.searchParams.get("cwd") || "";
  const session = u.searchParams.get("session");
  if (!cwd && session) cwd = (snap?.sessions || []).find((s) => s.name === session)?.cwd || "";
  return { path: u.searchParams.get("path"), cwd, files: a.href };
}

export default function register(hub) {
  if (!LOCAL) return;
  document.addEventListener("mouseover", (e) => {
    const a = e.target.closest?.("a[href]");
    if (a && !a.dataset.reveal && target(a, hub.snapshot())) {
      a.dataset.reveal = "1";
      a.title = `Открыть в «Файлах» (${MAC ? "⌘" : "Ctrl"}-клик — показать в ${MAC ? "Finder" : "Проводнике"})`;
    }
  }, true);
  document.addEventListener("click", async (e) => {
    if (e.button !== 0 || e.shiftKey || e.altKey) return;
    const a = e.target.closest?.("a[href]");
    const t = a && target(a, hub.snapshot());
    if (!t) return;
    const reveal = MAC ? e.metaKey : e.ctrlKey;
    if (!reveal && t.files === a.href) return;   // обычный клик по ссылке «Файлов» — как без плагина
    e.preventDefault();
    e.stopPropagation();
    if (reveal && !(await hub.post("/api/reveal", { path: t.path, cwd: t.cwd })).error) return;
    window.open(t.files, "_blank", "noopener");   // file:/// браузер не откроет; не нашёлся в папке — «Файлы»
  }, true);
}
