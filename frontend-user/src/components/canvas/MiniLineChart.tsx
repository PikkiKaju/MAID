// Lightweight SVG line chart for loss/val_loss visualization

type Series = {
  label: string;
  color: string;
  data: number[];
};

type MiniLineChartProps = {
  series: Series[];
  height?: number; // pixels
  strokeWidth?: number;
  className?: string;
  // Optional domain labels for x-axis (e.g., epoch numbers). If omitted, labels use 0..N-1.
  xMin?: number;
  xMax?: number;
};

export default function MiniLineChart({ series, height = 160, strokeWidth = 2, className = '', xMin, xMax }: MiniLineChartProps) {
  // Increase left padding to fully contain y-axis labels without overflow
  const padding = { top: 12, right: 12, bottom: 20, left: 48 };
  const width = 600; // virtual width for viewBox; SVG will scale to container width

  // Flatten all values to compute y-domain
  const allValues = series.flatMap(s => s.data);
  const count = Math.max(...series.map(s => s.data.length));

  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const yMinRaw = allValues.length ? Math.min(...allValues) : 0;
  const yMaxRaw = allValues.length ? Math.max(...allValues) : 1;
  // Add 10% padding to y-domain
  const pad = (yMaxRaw - yMinRaw) * 0.1 || 0.1;
  const yMin = yMinRaw - pad;
  const yMax = yMaxRaw + pad;

  const toX = (i: number, n: number) => {
    if (n <= 1) return padding.left + innerW; // single point at right edge
    const step = innerW / (n - 1);
    return padding.left + i * step;
  };
  const toY = (v: number) => {
    const t = (v - yMin) / (yMax - yMin || 1);
    const y = padding.top + (1 - t) * innerH;
    return y;
  };

  const buildPath = (data: number[]) => {
    if (!data || data.length < 2) return '';
    const cmds: string[] = [];
    for (let i = 0; i < data.length; i++) {
      const x = toX(i, data.length);
      const y = toY(data[i]);
      cmds.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
    }
    return cmds.join(' ');
  };

  // Y-axis ticks (4)
  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => yMin + (i * (yMax - yMin)) / ticks);

  return (
    <div className={`w-full overflow-hidden ${className}`} style={{ height }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
        {/* Background */}
        <rect x={0} y={0} width={width} height={height} fill="#ffffff" />
        {/* Grid lines and y labels */}
        {yTicks.map((t, i) => {
          const y = toY(t);
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e5e7eb" strokeWidth={1} />
              <text x={padding.left - 6} y={y + 4} textAnchor="end" fontSize={12} fill="#64748b">
                {Number.isFinite(t) ? t.toFixed(3) : ''}
              </text>
            </g>
          );
        })}
        {/* Border */}
        <rect x={padding.left} y={padding.top} width={innerW} height={innerH} fill="none" stroke="#e5e7eb" strokeWidth={1} />

        {/* Series paths */}
        {series.map((s, idx) => (
          <path key={idx} d={buildPath(s.data)} fill="none" stroke={s.color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
        ))}

        {/* Single-point markers */}
        {series.map((s, idx) => (
          s.data.length === 1 ? (
            <circle key={`pt-${idx}`} cx={toX(0, 2)} cy={toY(s.data[0])} r={3} fill={s.color} />
          ) : null
        ))}

        {/* X-axis epochs labels at start/middle/end if enough points */}
        {count > 0 && (
          <g fontSize={12} fill="#64748b">
            {(() => {
              const start = Number.isFinite(xMin as number) ? (xMin as number) : 0;
              const end = Number.isFinite(xMax as number) ? (xMax as number) : (count - 1);
              const mid = Math.floor((start + end) / 2);
              return (
                <>
                  <text x={padding.left} y={height - 4}>{start}</text>
                  {count > 2 && (
                    <text x={padding.left + innerW / 2} y={height - 4} textAnchor="middle">{mid}</text>
                  )}
                  {count > 1 && (
                    <text x={padding.left + innerW} y={height - 4} textAnchor="end">{end}</text>
                  )}
                </>
              );
            })()}
          </g>
        )}
      </svg>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-1">
        {series.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
            <span className="inline-block" style={{ width: 12, height: 2, backgroundColor: s.color }} />
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
