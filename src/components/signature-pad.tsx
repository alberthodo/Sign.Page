"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SignaturePadProps = {
  onChange: (dataUrl: string | null) => void;
  className?: string;
};

export function SignaturePad({ onChange, className }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasStroke, setHasStroke] = useState(false);

  const syncEmpty = useCallback(() => {
    onChange(null);
    setHasStroke(false);
  }, [onChange]);

  const exportSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasStroke) {
      syncEmpty();
      return;
    }
    onChange(canvas.toDataURL("image/png"));
  }, [hasStroke, onChange, syncEmpty]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * ratio);
      canvas.height = Math.floor(rect.height * ratio);
      ctx.scale(ratio, ratio);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      setHasStroke(false);
      syncEmpty();
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [syncEmpty]);

  function pointerPos(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function startStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      return;
    }
    drawing.current = true;
    canvas.setPointerCapture(event.pointerId);
    const { x, y } = pointerPos(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function moveStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) {
      return;
    }
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) {
      return;
    }
    const { x, y } = pointerPos(event);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasStroke(true);
  }

  function endStroke() {
    if (!drawing.current) {
      return;
    }
    drawing.current = false;
    exportSignature();
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    syncEmpty();
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="overflow-hidden rounded-lg border bg-white">
        <canvas
          ref={canvasRef}
          className="h-36 w-full touch-none cursor-crosshair"
          aria-label="Draw your signature"
          onPointerDown={startStroke}
          onPointerMove={moveStroke}
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
        />
      </div>
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={clear}>
          Clear signature
        </Button>
      </div>
    </div>
  );
}
