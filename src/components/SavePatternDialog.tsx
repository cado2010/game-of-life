import { useState } from "react";
import type { Pattern } from "../engine/types";

interface SavePatternDialogProps {
  getLiveCells: () => [number, number][];
  onSave: (
    pattern: Omit<Pattern, "createdAt" | "updatedAt">
  ) => Promise<Pattern>;
  onClose: () => void;
}

export function SavePatternDialog({
  getLiveCells,
  onSave,
  onClose,
}: SavePatternDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [author, setAuthor] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required");
      return;
    }

    const cells = getLiveCells();
    if (cells.length === 0) {
      setError("No cells to save — create a pattern first");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: trimmedName,
        cells,
        ...(description.trim() && { description: description.trim() }),
        ...(author.trim() && { author: author.trim() }),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-96 p-6">
        <h2 className="text-lg font-semibold text-gray-200 mb-4">
          Save Pattern
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-200 text-sm focus:outline-none focus:border-cyan-500"
              placeholder="My awesome pattern"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-200 text-sm focus:outline-none focus:border-cyan-500"
              placeholder="Optional description"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Author</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-200 text-sm focus:outline-none focus:border-cyan-500"
              placeholder="Optional author"
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-950/50 px-3 py-2 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded text-sm font-medium bg-cyan-700 text-cyan-100 hover:bg-cyan-600 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
