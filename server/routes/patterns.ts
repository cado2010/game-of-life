import { Router } from "express";
import fs from "fs/promises";
import path from "path";

const router = Router();

function getPatternsDir() {
  return process.env.PATTERNS_ROOT ?? path.resolve(process.cwd(), "patterns");
}
function getSamplesDir() {
  return path.join(getPatternsDir(), "samples");
}
function getUserDir() {
  return path.join(getPatternsDir(), "user");
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

router.get("/", async (_req, res) => {
  try {
    const samplesDir = getSamplesDir();
    const userDir = getUserDir();
    await ensureDir(samplesDir);
    await ensureDir(userDir);

    const sampleFiles = await fs.readdir(samplesDir);
    const userFiles = await fs.readdir(userDir);

    const samples = await Promise.all(
      sampleFiles
        .filter((f) => f.endsWith(".json"))
        .map(async (filename) => {
          const content = await fs.readFile(
            path.join(samplesDir, filename),
            "utf-8"
          );
          const data = JSON.parse(content);
          return {
            name: data.name as string,
            filename,
            category: data.category as string | undefined,
          };
        })
    );

    const user = await Promise.all(
      userFiles
        .filter((f) => f.endsWith(".json"))
        .map(async (filename) => {
          const content = await fs.readFile(
            path.join(userDir, filename),
            "utf-8"
          );
          const data = JSON.parse(content);
          return {
            name: data.name as string,
            filename,
            category: data.category as string | undefined,
          };
        })
    );

    res.json({ samples, user });
  } catch (err) {
    res.status(500).json({ error: "Failed to list patterns", detail: String(err) });
  }
});

router.get("/:source/:filename", async (req, res) => {
  const { source, filename } = req.params;
  if (source !== "samples" && source !== "user") {
    res.status(400).json({ error: "Source must be 'samples' or 'user'" });
    return;
  }

  const dir = source === "samples" ? getSamplesDir() : getUserDir();
  const filePath = path.join(dir, filename!);

  try {
    const content = await fs.readFile(filePath, "utf-8");
    res.json(JSON.parse(content));
  } catch {
    res.status(404).json({ error: "Pattern not found" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, cells, description, author, category } = req.body;

    if (!name || !cells || !Array.isArray(cells)) {
      res.status(400).json({ error: "Missing required fields: name, cells" });
      return;
    }

    const userDir = getUserDir();
    await ensureDir(userDir);
    const filename = slugify(name) + ".json";
    const filePath = path.join(userDir, filename);

    try {
      await fs.access(filePath);
      res.status(409).json({ error: "Pattern with that name already exists" });
      return;
    } catch {
      // File doesn't exist — proceed
    }

    const now = new Date().toISOString();
    const pattern = {
      name,
      cells,
      ...(description && { description }),
      ...(author && { author }),
      ...(category && { category }),
      createdAt: now,
      updatedAt: now,
    };

    await fs.writeFile(filePath, JSON.stringify(pattern, null, 2), "utf-8");
    res.status(201).json(pattern);
  } catch (err) {
    res.status(500).json({ error: "Failed to save pattern", detail: String(err) });
  }
});

router.put("/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(getUserDir(), filename!);

    let existing: Record<string, unknown>;
    try {
      const content = await fs.readFile(filePath, "utf-8");
      existing = JSON.parse(content);
    } catch {
      res.status(404).json({ error: "Pattern not found" });
      return;
    }

    const updated = {
      ...existing,
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    await fs.writeFile(filePath, JSON.stringify(updated, null, 2), "utf-8");
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update pattern", detail: String(err) });
  }
});

router.delete("/:filename", async (req, res) => {
  try {
    const { filename } = req.params;

    const samplePath = path.join(getSamplesDir(), filename!);
    try {
      await fs.access(samplePath);
      res.status(403).json({ error: "Cannot delete sample patterns" });
      return;
    } catch {
      // Not a sample — proceed
    }

    const filePath = path.join(getUserDir(), filename!);
    try {
      await fs.unlink(filePath);
      res.status(204).send();
    } catch {
      res.status(404).json({ error: "Pattern not found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to delete pattern", detail: String(err) });
  }
});

export default router;
