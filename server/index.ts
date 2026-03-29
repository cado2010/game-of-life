import express from "express";
import cors from "cors";
import path from "path";
import patternsRouter from "./routes/patterns.js";

export function startServer(appRoot?: string) {
  const root = appRoot ?? process.cwd();
  const app = express();
  const PORT = 3001;

  app.use(cors());
  app.use(express.json());

  process.env.PATTERNS_ROOT = path.resolve(root, "patterns");

  app.use("/api/patterns", patternsRouter);

  const distPath = path.resolve(root, "dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  app.listen(PORT, () => {
    console.log(`Game of Life API server running on http://localhost:${PORT}`);
  });

  return app;
}

// Direct execution (npm run dev / npm start)
const isDirectRun =
  process.argv[1]?.endsWith("server/index.ts") ||
  process.argv[1]?.endsWith("server/index.js") ||
  process.argv[1]?.endsWith("server\\index.ts") ||
  process.argv[1]?.endsWith("server\\index.js");

if (isDirectRun) {
  startServer();
}
