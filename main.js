// File links in chats: a click opens the file in the hub's "Files", as without the plugin; Cmd-click (Ctrl-click on
// Windows) shows the file in its folder (Finder on Mac, Explorer on Windows). Only on the hub computer: the window
// opens on its screen.
const LOCAL = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(location.hostname);
const MAC = /Mac/i.test(navigator.platform || navigator.userAgent);

// UI strings: English by default, Russian when the hub language is Russian (other languages fall back to English).
const STR = {
  en: { open: "Open in Files ({key}-click: show in {app})", finder: "Finder", explorer: "Explorer" },
  ru: { open: "Открыть в «Файлах» ({key}-клик — показать в {app})", finder: "Finder", explorer: "Проводнике" },
};
// hub.lang is read at use time, not at module load
const t = (hub, k, v = {}) => {
  const s = (STR[hub.lang] ?? STR.en)[k] ?? STR.en[k];
  return s.replace(/\{(\w+)\}/g, (m, n) => v[n] ?? m);
};

// link -> { path, cwd, files } or null: a feed link (a "Files" address #/<root>/<path>?session=..., the path as the
// session wrote it is in data-path), /open?path=... or file:///...
function target(a, snap) {
  let u;
  try { u = new URL(a.href, location.href); } catch { return null; }
  const port = String(snap?.files_port || 8788);
  if (u.protocol === "file:") {
    const path = decodeURIComponent(u.pathname).replace(/^\/([A-Za-z]:)/, "$1");
    return { path, cwd: "", files: `${location.protocol}//${location.hostname}:${port}/open?path=${encodeURIComponent(path)}` };
  }
  if (u.port !== port) return null;
  const sessionCwd = (name) => (name && (snap?.sessions || []).find((s) => s.name === name)?.cwd) || "";
  if (u.pathname === "/" && u.hash.startsWith("#/") && a.dataset.path) {
    const q = new URLSearchParams(u.hash.split("?")[1] || "");
    return { path: a.dataset.path, cwd: sessionCwd(q.get("session")), files: a.href };
  }
  if (u.pathname !== "/open" || !u.searchParams.get("path")) return null;
  return { path: u.searchParams.get("path"), cwd: u.searchParams.get("cwd") || sessionCwd(u.searchParams.get("session")), files: a.href };
}

export default function register(hub) {
  if (!LOCAL) return;
  document.addEventListener("mouseover", (e) => {
    const a = e.target.closest?.("a[href]");
    if (a && !a.dataset.reveal && target(a, hub.snapshot())) {
      a.dataset.reveal = "1";
      a.title = t(hub, "open", { key: MAC ? "⌘" : "Ctrl", app: t(hub, MAC ? "finder" : "explorer") });
    }
  }, true);
  document.addEventListener("click", async (e) => {
    if (e.button !== 0 || e.shiftKey || e.altKey) return;
    const a = e.target.closest?.("a[href]");
    const t = a && target(a, hub.snapshot());
    if (!t) return;
    const reveal = MAC ? e.metaKey : e.ctrlKey;
    if (!reveal && t.files === a.href) return;   // a plain click on a "Files" link: as without the plugin
    e.preventDefault();
    e.stopPropagation();
    if (reveal && !(await hub.post("/api/reveal", { path: t.path, cwd: t.cwd })).error) return;
    window.open(t.files, "_blank", "noopener");   // the browser will not open file:///; not found in the folder: open "Files"
  }, true);
}
