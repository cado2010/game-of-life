import { useRef, useEffect, useState, useCallback } from "react";
import { PopulationGraph } from "./PopulationGraph";

interface PopulationGraphPopupProps {
  history: number[];
  startGeneration: number;
  recenterSignal: number;
  onClose: () => void;
}

const MIN_W = 300;
const MIN_H = 180;
const EDGE_MARGIN = 40;

function clampPos(x: number, y: number, w: number, h: number) {
  return {
    x: Math.max(-w + EDGE_MARGIN, Math.min(window.innerWidth - EDGE_MARGIN, x)),
    y: Math.max(0, Math.min(window.innerHeight - EDGE_MARGIN, y)),
  };
}

export function PopulationGraphPopup({
  history,
  startGeneration,
  recenterSignal,
  onClose,
}: PopulationGraphPopupProps) {
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 520, h: 280 });
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const centerPopup = useCallback((w: number, h: number) => {
    setPos({
      x: Math.max(0, Math.floor((window.innerWidth - w) / 2)),
      y: Math.max(0, Math.floor((window.innerHeight - h) / 2)),
    });
  }, []);

  useEffect(() => {
    centerPopup(size.w, size.h);
  }, []);

  // Recenter when signal changes (double-click graph while already open)
  useEffect(() => {
    if (recenterSignal > 0) {
      centerPopup(size.w, size.h);
    }
  }, [recenterSignal, centerPopup, size.w, size.h]);

  // Escape key to close
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Dragging the title bar
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const onTitleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragOffset.current = {
      x: e.clientX - (pos?.x ?? 0),
      y: e.clientY - (pos?.y ?? 0),
    };
    e.preventDefault();
  }, [pos]);

  // Resizing from bottom-right corner
  const isResizing = useRef(false);
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    resizeStart.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };
    e.preventDefault();
    e.stopPropagation();
  }, [size]);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (isDragging.current) {
        const raw = {
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y,
        };
        setPos((prev) => clampPos(raw.x, raw.y, prev ? size.w : 520, 30));
      }
      if (isResizing.current) {
        const dx = e.clientX - resizeStart.current.x;
        const dy = e.clientY - resizeStart.current.y;
        setSize({
          w: Math.max(MIN_W, resizeStart.current.w + dx),
          h: Math.max(MIN_H, resizeStart.current.h + dy),
        });
      }
    }
    function onMouseUp() {
      isDragging.current = false;
      isResizing.current = false;
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [size]);

  if (!pos) return null;

  const graphW = size.w - 24;
  const graphH = size.h - 44;

  return (
    <div
      ref={popupRef}
      className="fixed z-50 flex flex-col rounded-lg border border-gray-700 bg-gray-900 shadow-2xl shadow-black/60"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-3 py-1.5 bg-gray-800 rounded-t-lg cursor-move select-none border-b border-gray-700"
        onMouseDown={onTitleMouseDown}
      >
        <span className="text-xs text-gray-300 font-medium">Population Trend</span>
        <button
          onClick={onClose}
          className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-gray-600 transition-colors text-xs"
        >
          ✕
        </button>
      </div>

      {/* Graph area */}
      <div className="flex-1 flex items-center justify-center p-3 overflow-hidden">
        <PopulationGraph
          history={history}
          startGeneration={startGeneration}
          width={Math.max(200, graphW)}
          height={Math.max(80, graphH)}
        />
      </div>

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
        onMouseDown={onResizeMouseDown}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-600 absolute bottom-0.5 right-0.5">
          <path d="M12 2L2 12M12 6L6 12M12 10L10 12" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </div>
    </div>
  );
}
