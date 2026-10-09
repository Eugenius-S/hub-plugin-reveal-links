// Ссылки на файлы в чатах → папка с выделенным файлом (Finder на Mac, Проводник на Windows). Только на компьютере
// хаба: окно открывается на его экране; с телефона и по ⌘/Ctrl-клику ссылка открывается, как раньше, в «Файлах».
const LOCAL = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(location.hostname);
const MAC = /Mac/i.test(navigator.platform || navigator.userAgent);
const WHERE = MAC ? "Finder" : "Проводнике";

// ссылка → { path, cwd } или null: адрес «Файлов» /open?path=… или file:///…
function target(a, snap) {
  let u;
  try { u = new URL(a.href, location.href); } catch { return null; }
  if (u.protocol === "file:") return { path: decodeURIComponent(u.pathname).replace(/^\/([A-Za-z]:)/, "$1"), cwd: "" };
  const port = String(snap?.files_port || 8788);
  if (u.pathname !== "/open" || u.port !== port || !u.searchParams.get("path")) return null;
  let cwd = u.searchParams.get("cwd") || "";
  const session = u.searchParams.get("session");
  if (!cwd && session) cwd = (snap?.sessions || []).find((s) => s.name === session)?.cwd || "";
  return { path: u.searchParams.get("path"), cwd };
}

export default function register(hub) {
  if (!LOCAL) return;
  document.addEventListener("mouseover", (e) => {
    const a = e.target.closest?.("a[href]");
    if (a && !a.dataset.reveal && target(a, hub.snapshot())) {
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
    const href = a.href;
    const r = await hub.post("/api/reveal", t);
    if (r.error) window.open(href, "_blank", "noopener");   // не нашёлся или хаб без /api/reveal — как раньше
  }, true);
}
