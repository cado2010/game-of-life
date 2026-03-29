import { useRef, useEffect } from "react";

interface PopulationGraphProps {
  history: number[];
  startGeneration: number;
  width?: number;
  height?: number;
}

const COLOR_UP = "#22c55e";
const COLOR_DOWN = "#ef4444";
const COLOR_FLAT = "#6b7280";
const BG = "rgba(0, 0, 0, 0.3)";
const BORDER = "rgba(75, 85, 99, 0.5)";
const GRID_COLOR = "rgba(107, 114, 128, 0.25)";
const LABEL_COLOR = "rgba(156, 163, 175, 0.8)";

function niceStep(range: number, targetTicks: number): number {
  const rough = range / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const residual = rough / mag;
  let nice: number;
  if (residual <= 1.5) nice = 1;
  else if (residual <= 3) nice = 2;
  else if (residual <= 7) nice = 5;
  else nice = 10;
  return Math.max(1, nice * mag);
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 10_000) return (n / 1_000).toFixed(0) + "k";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

export function PopulationGraph({
  history,
  startGeneration,
  width = 240,
  height = 56,
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

    const fontSize = Math.max(7, Math.round(height * 0.14));
    ctx.font = `${fontSize}px monospace`;
    ctx.textBaseline = "middle";

    const marginLeft = 30;
    const marginRight = 6;
    const marginTop = 4;
    const marginBottom = fontSize + 6;

    const graphW = width - marginLeft - marginRight;
    const graphH = height - marginTop - marginBottom;

    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(marginLeft, marginTop, graphW, graphH);

    if (history.length < 2) return;

    const maxPop = Math.max(...history, 1);
    const minPop = Math.min(...history, 0);
    const popRange = maxPop - minPop || 1;

    const toY = (val: number) =>
      marginTop + graphH - ((val - minPop) / popRange) * graphH;
    const toX = (i: number) =>
      marginLeft + (i / (history.length - 1)) * graphW;

    const yStep = niceStep(popRange, 3);
    const yStart = Math.ceil(minPop / yStep) * yStep;

    ctx.fillStyle = LABEL_COLOR;
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.5;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.font = `${fontSize}px monospace`;

    for (let v = yStart; v <= maxPop; v += yStep) {
      const y = toY(v);
      if (y < marginTop + 2 || y > marginTop + graphH - 2) continue;
      ctx.beginPath();
      ctx.setLineDash([2, 2]);
      ctx.moveTo(marginLeft, y);
      ctx.lineTo(marginLeft + graphW, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText(formatNum(v), marginLeft - 3, y);
    }

    const endGen = startGeneration + history.length - 1;
    const xStep = niceStep(history.length, 4);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    for (let i = 0; i < history.length; i++) {
      const gen = startGeneration + i;
      if (gen === 0 || gen % xStep === 0) {
        const x = toX(i);
        if (x < marginLeft + 8 || x > marginLeft + graphW - 8) continue;
        ctx.beginPath();
        ctx.setLineDash([2, 2]);
        ctx.strokeStyle = GRID_COLOR;
        ctx.moveTo(x, marginTop);
        ctx.lineTo(x, marginTop + graphH);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = LABEL_COLOR;
        ctx.fillText(String(gen), x, marginTop + graphH + 2);
      }
    }

    ctx.fillStyle = LABEL_COLOR;
    ctx.textAlign = "center";
    const lastX = toX(history.length - 1);
    ctx.fillText(String(endGen), lastX, marginTop + graphH + 2);

    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    for (let i = 1; i < history.length; i++) {
      const diff = history[i] - history[i - 1];
      ctx.strokeStyle =
        diff > 0 ? COLOR_UP : diff < 0 ? COLOR_DOWN : COLOR_FLAT;
      ctx.beginPath();
      ctx.moveTo(toX(i - 1), toY(history[i - 1]));
      ctx.lineTo(toX(i), toY(history[i]));
      ctx.stroke();
    }
  }, [history, startGeneration, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="rounded"
      title="Population trend"
    />
  );
}
