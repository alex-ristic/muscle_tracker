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
const basePath = normalizeBasePath(process.env.BASE_PATH || process.env.VITE_BASE_PATH || "/");

const dataSchemaVersion = 2;
const blankData = { schemaVersion: dataSchemaVersion, updatedAt: "", activeSession: null, history: [], units: "kg" };
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
  await writeJson(stampData(blankData));
} else {
  const existing = await readJson();
  if (!existing.updatedAt || existing.schemaVersion !== dataSchemaVersion) {
    await writeJson(stampData(existing));
  }
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
    return normalizeData(JSON.parse(await readFile(dataFile, "utf8")));
  } catch {
    return normalizeData(blankData);
  }
}

async function writeJson(data) {
  const tmpFile = `${dataFile}.tmp`;
  await writeFile(tmpFile, JSON.stringify(normalizeData(data), null, 2));
  await rename(tmpFile, dataFile);
}

function normalizeData(data) {
  return {
    ...blankData,
    ...data,
    schemaVersion: Number(data?.schemaVersion) || dataSchemaVersion,
    updatedAt: typeof data?.updatedAt === "string" ? data.updatedAt : "",
    activeSession: data?.activeSession ?? null,
    history: Array.isArray(data?.history) ? data.history : [],
    units: data?.units === "lb" ? "lb" : "kg",
  };
}

function stampData(data) {
  return { ...normalizeData(data), schemaVersion: dataSchemaVersion, updatedAt: new Date().toISOString() };
}

function normalizeBasePath(path) {
  if (!path || path === "/") return "/";
  return `/${path.replace(/^\/+|\/+$/g, "")}/`;
}

function stripBasePath(pathname) {
  if (basePath === "/" || !pathname.startsWith(basePath)) return pathname;
  return `/${pathname.slice(basePath.length)}`;
}

function isDataPath(pathname) {
  return pathname === "/api/data" || pathname === `${basePath}api/data`;
}

function isHealthPath(pathname) {
  return pathname === "/api/health" || pathname === `${basePath}api/health`;
}

function serveStatic(request, response) {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
  const pathname = stripBasePath(decodeURIComponent(url.pathname));
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

    if (isHealthPath(url.pathname)) {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (isDataPath(url.pathname) && request.method === "GET") {
      sendJson(response, 200, await readJson());
      return;
    }

    if (isDataPath(url.pathname) && request.method === "PUT") {
      const body = await readBody(request);
      const data = normalizeData(JSON.parse(body || "{}"));
      const current = await readJson();
      if (current.updatedAt && !data.updatedAt) {
        sendJson(response, 409, { error: "Refusing to overwrite VPS data without updatedAt metadata." });
        return;
      }
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
  console.log(`Base path: ${basePath}`);
  console.log(`Data file: ${dataFile}`);
});
