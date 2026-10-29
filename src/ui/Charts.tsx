// Small dependency-free SVG charts. Colors come from CSS tokens.

export function LineChart({ points, goal, unit = '', height = 160, label }: { points: { x: string; y: number }[]; goal?: number; unit?: string; height?: number; label: string }) {
  const W = 340, H = height, padL = 36, padR = 12, padT = 14, padB = 24;
  if (points.length === 0) return <p className="muted small">No data yet.</p>;
  const ys = points.map((p) => p.y).concat(goal !== undefined ? [goal] : []);
  let min = Math.min(...ys), max = Math.max(...ys);
  if (max - min < 4) { min -= 2; max += 2; }
  const pad = (max - min) * 0.1; min -= pad; max += pad;
  const x = (i: number) => padL + (points.length === 1 ? (W - padL - padR) / 2 : (i / (points.length - 1)) * (W - padL - padR));
  const y = (v: number) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ');
  const area = `${path} L${x(points.length - 1).toFixed(1)},${H - padB} L${x(0).toFixed(1)},${H - padB} Z`;
  const ticks = [min + pad, (min + max) / 2, max - pad].map((v) => Math.round(v));
  const last = points[points.length - 1];
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className="grid" />
            <text x={padL - 6} y={y(t) + 4} className="axis" textAnchor="end">{t}</text>
          </g>
        ))}
        {goal !== undefined && (
          <g>
            <line x1={padL} x2={W - padR} y1={y(goal)} y2={y(goal)} className="goal-line" />
            <text x={W - padR} y={y(goal) - 5} className="axis goal-label" textAnchor="end">goal {goal}{unit}</text>
          </g>
        )}
        <path d={area} className="area" />
        <path d={path} className="line" />
        {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.y)} r={i === points.length - 1 ? 4.5 : 2.5} className={i === points.length - 1 ? 'dot end' : 'dot'} />)}
        <text x={padL} y={H - 6} className="axis">{points[0].x}</text>
        {points.length > 1 && <text x={W - padR} y={H - 6} className="axis" textAnchor="end">{last.x}</text>}
      </svg>
    </figure>
  );
}

export function BarChart({ bars, guide, height = 150, label }: { bars: { x: string; y: number }[]; guide?: number; height?: number; label: string }) {
  const W = 340, H = height, padL = 32, padR = 8, padT = 14, padB = 22;
  const max = Math.max(guide ?? 0, ...bars.map((b) => b.y), 1) * 1.1;
  const bw = (W - padL - padR) / bars.length;
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} className="grid" />
        <text x={padL - 6} y={H - padB + 4} className="axis" textAnchor="end">0</text>
        {guide !== undefined && (
          <g>
            <line x1={padL} x2={W - padR} y1={y(guide)} y2={y(guide)} className="goal-line" />
            <text x={padL - 6} y={y(guide) + 4} className="axis" textAnchor="end">{guide}</text>
          </g>
        )}
        {bars.map((b, i) => (
          <g key={i}>
            <rect x={padL + i * bw + bw * 0.18} y={y(b.y)} width={bw * 0.64} height={Math.max(0, H - padB - y(b.y))} className={`bar ${i === bars.length - 1 ? 'current' : ''}`} rx="2" />
            {b.y > 0 && <text x={padL + i * bw + bw / 2} y={y(b.y) - 4} className="axis val" textAnchor="middle">{b.y}</text>}
            <text x={padL + i * bw + bw / 2} y={H - 6} className="axis" textAnchor="middle">{b.x}</text>
          </g>
        ))}
      </svg>
    </figure>
  );
}
