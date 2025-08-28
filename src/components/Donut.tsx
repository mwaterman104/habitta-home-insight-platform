interface DonutProps { 
  value?: number | null; 
  size?: number; 
  track?: string;
}

export default function Donut({ value, size = 96, track = "hsl(var(--muted))" }: DonutProps) {
  const pct = Math.max(0, Math.min(100, Number(value ?? 0)));
  const angle = pct * 3.6;
  
  return (
    <div className="relative" style={{ width: size, height: size, color: "hsl(var(--primary))" }}>
      <div 
        className="absolute inset-0 rounded-full" 
        style={{ 
          background: `conic-gradient(currentColor ${angle}deg, ${track} 0deg)` 
        }} 
      />
      <div className="absolute inset-[12px] rounded-full bg-background" aria-hidden />
      <div className="absolute inset-0 grid place-items-center text-sm font-semibold">
        {Math.round(pct)}%
      </div>
    </div>
  );
}