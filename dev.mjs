// Local development: build, serve dist/, rebuild on changes, and run the Decap admin backend
// so /admin/ can save posts straight into content/blog/ without GitHub.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const PORT = Number(process.env.PORT) || 5173;
const OUT = path.resolve("dist");
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".xml": "application/xml", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon",
  ".yml": "text/yaml", ".txt": "text/plain"
};

function build() {
  const r = spawnSync(process.execPath, ["build.mjs"], { stdio: "inherit" });
  if (r.status !== 0) console.error("build failed, fix the error and save again");
}
build();

// rebuild on change, debounced
let timer;
for (const dir of ["src", "content", "templates"]) {
  if (!fs.existsSync(dir)) continue;
  fs.watch(dir, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(build, 150);
  });
}
fs.watchFile("build.mjs", { interval: 500 }, build);

http.createServer((req, res) => {
  let rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = path.join(OUT, rel);
  if (!file.startsWith(OUT)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!rel.endsWith("/")) { res.writeHead(301, { Location: rel + "/" }).end(); return; }
    file = path.join(file, "index.html");
  }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain" }).end("404"); return; }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`\n  sayt:   http://localhost:${PORT}`);
  console.log(`  admin:  http://localhost:${PORT}/admin/  (lokal rejim, GitHub kerak emas)\n`);
});

// Decap local backend on :8081 writes into this folder
const bin = path.resolve("node_modules/.bin/decap-server");
if (fs.existsSync(bin)) {
  const decap = spawn(bin, [], { stdio: ["ignore", "ignore", "inherit"] });
  process.on("exit", () => decap.kill());
  process.on("SIGINT", () => process.exit());
} else {
  console.log("  (decap-server o'rnatilmagan: npm install)");
}
