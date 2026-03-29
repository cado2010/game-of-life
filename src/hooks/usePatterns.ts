import { useState, useCallback, useEffect } from "react";
import type { Pattern, PatternMeta, PatternListResponse } from "../engine/types";

export interface UsePatternsReturn {
  samples: PatternMeta[];
  userPatterns: PatternMeta[];
  loading: boolean;
  loadPattern: (source: string, filename: string) => Promise<Pattern>;
  savePattern: (
    pattern: Omit<Pattern, "createdAt" | "updatedAt">
  ) => Promise<Pattern>;
  deletePattern: (filename: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function usePatterns(): UsePatternsReturn {
  const [samples, setSamples] = useState<PatternMeta[]>([]);
  const [userPatterns, setUserPatterns] = useState<PatternMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/patterns");
      const data: PatternListResponse = await res.json();
      setSamples(data.samples);
      setUserPatterns(data.user);
    } catch (err) {
      console.error("Failed to fetch patterns:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPattern = useCallback(
    async (source: string, filename: string): Promise<Pattern> => {
      const res = await fetch(`/api/patterns/${source}/${filename}`);
      if (!res.ok) throw new Error("Failed to load pattern");
      return res.json();
    },
    []
  );

  const savePattern = useCallback(
    async (
      pattern: Omit<Pattern, "createdAt" | "updatedAt">
    ): Promise<Pattern> => {
      const res = await fetch("/api/patterns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pattern),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save pattern");
      }
      const saved = await res.json();
      await refresh();
      return saved;
    },
    [refresh]
  );

  const deletePattern = useCallback(
    async (filename: string): Promise<void> => {
      const res = await fetch(`/api/patterns/${filename}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete pattern");
      }
      await refresh();
    },
    [refresh]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    samples,
    userPatterns,
    loading,
    loadPattern,
    savePattern,
    deletePattern,
    refresh,
  };
}
