"use client";

import React, { useRef, useState, useEffect } from "react";
import { Trash2 } from "lucide-react";

interface SignaturePadProps {
  value: string; // base64 string
  onChange: (base64: string) => void;
  clearLabel?: string;
  placeholder?: string;
}

export default function SignaturePad({
  value,
  onChange,
  clearLabel = "Clear",
  placeholder = "Draw your signature here..."
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  // Initialize canvas with proper scale for high DPI screens
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear and draw background
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a"; // slate-900
    ctx.lineWidth = 3;

    // Check if initial value is provided
    if (value && value.startsWith("data:image")) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setIsEmpty(false);
      };
      img.src = value;
    }
  }, [value]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Support touch events
    if ("touches" in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setIsEmpty(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    // Save as base64
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const base64 = canvas.toDataURL("image/png");
    onChange(base64);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onChange("");
  };

  return (
    <div className="space-y-2">
      <div className="relative border border-slate-200 bg-slate-50 rounded-xl overflow-hidden h-44 shadow-inner">
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs italic font-medium select-none">
            {placeholder}
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={400}
          height={176}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full cursor-crosshair touch-none"
        />
      </div>
      {!isEmpty && (
        <button
          type="button"
          onClick={clearCanvas}
          className="py-1 px-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-rose-600 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5 ml-auto shadow-sm"
        >
          <Trash2 className="w-3.5 h-3.5" /> {clearLabel}
        </button>
      )}
    </div>
  );
}
