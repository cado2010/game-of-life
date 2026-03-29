import { useRef, useEffect } from "react";

interface PopulationGraphProps {
  history: number[];
  width?: number;
  height?: number;
}

const COLOR_UP = "#22c55e";
const COLOR_DOWN = "#ef4444";
const COLOR_FLAT = "#6b7280";
const BG = "rgba(0, 0, 0, 0.3)";
const BORDER = "rgba(75, 85, 99, 0.5)";

export function PopulationGraph({
  history,
  width = 200,
  height = 32,
}: PopulationGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    if (history.length < 2) return;

    const maxPop = Math.max(...history, 1);
    const pad = 3;
    const graphH = height - pad * 2;
    const graphW = width - pad * 2;

    const stepX = graphW / (history.length - 1);

    const toY = (val: number) => pad + graphH - (val / maxPop) * graphH;
    const toX = (i: number) => pad + i * stepX;

    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    for (let i = 1; i < history.length; i++) {
      const diff = history[i] - history[i - 1];
      ctx.strokeStyle = diff > 0 ? COLOR_UP : diff < 0 ? COLOR_DOWN : COLOR_FLAT;
      ctx.beginPath();
      ctx.moveTo(toX(i - 1), toY(history[i - 1]));
      ctx.lineTo(toX(i), toY(history[i]));
      ctx.stroke();
    }
  }, [history, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="rounded"
      title="Population trend"
    />
  );
}
