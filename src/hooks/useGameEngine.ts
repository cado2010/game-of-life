import { useState, useCallback, useRef, useEffect } from "react";
import { GameEngine } from "../engine/GameEngine";
import type { CellKey } from "../engine/types";

export interface UseGameEngineReturn {
  liveCells: Set<CellKey>;
  generation: number;
  population: number;
  isRunning: boolean;
  speed: number;
  step: () => void;
  stepN: (n: number) => void;
  run: () => void;
  stop: () => void;
  setSpeed: (ms: number) => void;
  toggleCell: (col: number, row: number) => void;
  clear: () => void;
  loadCells: (cells: [number, number][]) => void;
  getLiveCells: () => [number, number][];
}

export function useGameEngine(): UseGameEngineReturn {
  const engineRef = useRef(new GameEngine());
  const [liveCells, setLiveCells] = useState<Set<CellKey>>(new Set());
  const [generation, setGeneration] = useState(0);
  const [population, setPopulation] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeedState] = useState(200);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speedRef = useRef(speed);

  const sync = useCallback(() => {
    const engine = engineRef.current;
    setLiveCells(new Set(engine.getCellSet()));
    setGeneration(engine.generation);
    setPopulation(engine.population);
  }, []);

  const step = useCallback(() => {
    engineRef.current.step();
    sync();
  }, [sync]);

  const stepN = useCallback(
    (n: number) => {
      engineRef.current.stepN(n);
      sync();
    },
    [sync]
  );

  const stopInternal = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const run = useCallback(() => {
    stopInternal();
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      engineRef.current.step();
      sync();
    }, speedRef.current);
  }, [stopInternal, sync]);

  const stop = useCallback(() => {
    stopInternal();
  }, [stopInternal]);

  const setSpeed = useCallback(
    (ms: number) => {
      speedRef.current = ms;
      setSpeedState(ms);
      if (isRunning) {
        run();
      }
    },
    [isRunning, run]
  );

  const toggleCell = useCallback(
    (col: number, row: number) => {
      engineRef.current.toggleCell(col, row);
      sync();
    },
    [sync]
  );

  const clear = useCallback(() => {
    stopInternal();
    engineRef.current.clear();
    sync();
  }, [stopInternal, sync]);

  const loadCells = useCallback(
    (cells: [number, number][]) => {
      stopInternal();
      engineRef.current.loadPattern(cells);
      sync();
    },
    [stopInternal, sync]
  );

  const getLiveCells = useCallback(() => {
    return engineRef.current.getLiveCells();
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    liveCells,
    generation,
    population,
    isRunning,
    speed,
    step,
    stepN,
    run,
    stop,
    setSpeed,
    toggleCell,
    clear,
    loadCells,
    getLiveCells,
  };
}
