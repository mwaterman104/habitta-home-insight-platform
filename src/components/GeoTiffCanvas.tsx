import React, { useEffect, useRef, useState } from 'react';
import * as geotiff from 'geotiff';

interface GeoTiffCanvasProps {
  url: string;
  className?: string;
  alt?: string;
  mode?: 'auto' | 'rgb' | 'flux';
}

function clamp(n: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function heatColor(t: number): [number, number, number, number] {
  // Simple heatmap: blue -> cyan -> yellow -> orange -> red
  const stops: [number, number, number, number][] = [
    [0, 0, 128, 0],     // transparent dark blue
    [0, 128, 255, 120], // cyan
    [255, 255, 0, 140], // yellow
    [255, 165, 0, 160], // orange
    [255, 0, 0, 180],   // red
  ];
  const n = stops.length - 1;
  const x = clamp(t) * n;
  const i = Math.floor(x);
  const f = x - i;
  if (i >= n) return [...stops[n]] as [number, number, number, number];
  const a = stops[i];
  const b = stops[i + 1];
  return [
    Math.round(lerp(a[0], b[0], f)),
    Math.round(lerp(a[1], b[1], f)),
    Math.round(lerp(a[2], b[2], f)),
    Math.round(lerp(a[3], b[3], f)),
  ];
}

export const GeoTiffCanvas: React.FC<GeoTiffCanvasProps> = ({ url, className, alt, mode = 'auto' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function render() {
      try {
        setError(null);
        // Use fromUrl so we leverage browser fetch and CORS
        const tiff = await geotiff.fromUrl(url);
        const image = await tiff.getImage();
        const width = image.getWidth();
        const height = image.getHeight();
        const samples = image.getSamplesPerPixel();

        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx || !canvasRef.current) return;
        canvasRef.current.width = width;
        canvasRef.current.height = height;

        // Decide rendering mode
        const effectiveMode = mode === 'auto' ? (samples >= 3 ? 'rgb' : 'flux') : mode;

        if (effectiveMode === 'rgb') {
          const rasters = (await image.readRasters({ interleave: true, samples: [0, 1, 2] })) as unknown as Uint8Array;
          const imgData = ctx.createImageData(width, height);
          const data = imgData.data;
          for (let i = 0, p = 0; i < rasters.length; i += 3, p += 4) {
            data[p] = rasters[i];
            data[p + 1] = rasters[i + 1];
            data[p + 2] = rasters[i + 2];
            data[p + 3] = 255;
          }
          ctx.putImageData(imgData, 0, 0);
          return;
        }

        // Flux or single-band rendering with heatmap
        const band = (await image.readRasters({ interleave: true })) as Float32Array | Uint16Array | Int16Array | Uint8Array;
        const imgData = ctx.createImageData(width, height);
        const data = imgData.data;

        // Compute min/max ignoring sentinel -9999
        let min = Number.POSITIVE_INFINITY;
        let max = Number.NEGATIVE_INFINITY;
        for (let i = 0; i < band.length; i++) {
          const v = band[i] as number;
          if (v <= -9999 || Number.isNaN(v)) continue;
          if (v < min) min = v;
          if (v > max) max = v;
        }
        if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
          min = 0; max = 1;
        }

        for (let i = 0, p = 0; i < band.length; i++, p += 4) {
          const v = band[i] as number;
          if (v <= -9999 || Number.isNaN(v)) {
            data[p] = data[p + 1] = data[p + 2] = 0; data[p + 3] = 0; // transparent
          } else {
            const t = (v - min) / (max - min);
            const [r, g, b, a] = heatColor(t);
            data[p] = r; data[p + 1] = g; data[p + 2] = b; data[p + 3] = a;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      } catch (e: any) {
        if (!isCancelled) setError(e?.message || 'Failed to render GeoTIFF');
      }
    }

    render();
    return () => { isCancelled = true; };
  }, [url, mode]);

  if (error) {
    return <div className={className} aria-label={alt} />;
  }

  return <canvas ref={canvasRef} className={className} aria-label={alt} />;
};
