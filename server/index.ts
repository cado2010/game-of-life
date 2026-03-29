import express from "express";
import cors from "cors";
import path from "path";
import net from "net";
import patternsRouter from "./routes/patterns.js";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port);
  });
}

async function findAvailablePort(startPort: number): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  return startPort;
}

export async function startServer(
  appRoot?: string,
  userDataDir?: string
): Promise<number> {
  const root = appRoot ?? process.cwd();
  const app = express();

  app.use(cors());
  app.use(express.json());

  process.env.SAMPLES_DIR = path.resolve(root, "patterns", "samples");
  process.env.USER_PATTERNS_DIR = userDataDir
    ? path.resolve(userDataDir, "patterns", "user")
    : path.resolve(root, "patterns", "user");

  app.use("/api/patterns", patternsRouter);

  const distPath = path.resolve(root, "dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  const port = await findAvailablePort(3001);

  return new Promise((resolve) => {
    app.listen(port, () => {
      console.log(`Game of Life API server running on http://localhost:${port}`);
      resolve(port);
    });
  });
}

const isDirectRun =
  process.argv[1]?.endsWith("server/index.ts") ||
  process.argv[1]?.endsWith("server/index.js") ||
  process.argv[1]?.endsWith("server\\index.ts") ||
  process.argv[1]?.endsWith("server\\index.js");

if (isDirectRun) {
  startServer();
}
