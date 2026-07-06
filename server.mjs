import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 8080);
const dataDir = process.env.DATA_DIR || join(__dirname, "data");
const dataFile = process.env.DATA_FILE || join(dataDir, "muscle-tracker.json");
const staticDir = join(__dirname, "dist");

const blankData = { activeSession: null, history: [], units: "kg" };
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

await mkdir(dataDir, { recursive: true });
if (!existsSync(dataFile)) {
  await writeJson(blankData);
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function readJson() {
  try {
    return { ...blankData, ...JSON.parse(await readFile(dataFile, "utf8")) };
  } catch {
    return blankData;
  }
}

async function writeJson(data) {
  const tmpFile = `${dataFile}.tmp`;
  await writeFile(tmpFile, JSON.stringify({ ...blankData, ...data }, null, 2));
  await rename(tmpFile, dataFile);
}

function serveStatic(request, response) {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);
  const normalized = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  let filePath = join(staticDir, normalized);

  if (!filePath.startsWith(staticDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  if (!existsSync(filePath) || pathname === "/") {
    filePath = join(staticDir, "index.html");
  }

  const type = mimeTypes[extname(filePath)] || "application/octet-stream";
  response.writeHead(200, { "content-type": type });
  createReadStream(filePath).pipe(response);
}

createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

    if (url.pathname === "/api/health") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (url.pathname === "/api/data" && request.method === "GET") {
      sendJson(response, 200, await readJson());
      return;
    }

    if (url.pathname === "/api/data" && request.method === "PUT") {
      const body = await readBody(request);
      const data = JSON.parse(body || "{}");
      await writeJson(data);
      sendJson(response, 200, { ok: true });
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      sendJson(response, 404, { error: "Not found" });
      return;
    }

    serveStatic(request, response);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: "Server error" });
  }
}).listen(port, "0.0.0.0", () => {
  console.log(`Muscle Tracker listening on :${port}`);
  console.log(`Data file: ${dataFile}`);
});
