import { DEdge, DNode } from './types';

// World units: nodes are NODE_W × NODE_H cards centred on (x, y).
export const NODE_W = 360;
export const NODE_H = 160;

export type Pt = { x: number; y: number };
export type Poly = { pts: Pt[]; cum: number[]; length: number };

const inside = (p: Pt, n: DNode, pad: number) =>
  Math.abs(p.x - n.x) < NODE_W / 2 + pad && Math.abs(p.y - n.y) < NODE_H / 2 + pad;

// Centre-to-centre line (or a quadratic curve when `bend` is set), with the
// parts inside either card cut away so the arrow starts and ends at the borders.
export const edgePath = (e: DEdge, nodes: Record<string, DNode>): Poly => {
  const a = nodes[e.from], b = nodes[e.to];
  const bend = e.bend ?? 0;
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const cx = mx + (-(b.y - a.y) / len) * bend * 2, cy = my + ((b.x - a.x) / len) * bend * 2;
  const raw: Pt[] = [];
  const N = 120;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    raw.push({ x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * cx + t * t * b.x, y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * cy + t * t * b.y });
  }
  const pts = raw.filter((p) => !inside(p, a, 12) && !inside(p, b, 18));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return { pts, cum, length: cum[cum.length - 1] ?? 0 };
};

export const pointAt = (p: Poly, frac: number): Pt & { angle: number } => {
  const target = Math.max(0, Math.min(1, frac)) * p.length;
  let i = 1;
  while (i < p.pts.length - 1 && p.cum[i] < target) i++;
  const a = p.pts[i - 1], b = p.pts[i];
  const seg = p.cum[i] - p.cum[i - 1] || 1;
  const t = (target - p.cum[i - 1]) / seg;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: Math.atan2(b.y - a.y, b.x - a.x) };
};

// The first `frac` of the path as an SVG path string.
export const partialD = (p: Poly, frac: number) => {
  if (p.pts.length < 2 || frac <= 0) return '';
  const target = Math.min(1, frac) * p.length;
  let d = `M${p.pts[0].x},${p.pts[0].y}`;
  for (let i = 1; i < p.pts.length; i++) {
    if (p.cum[i] >= target) {
      const e = pointAt(p, frac);
      return d + ` L${e.x},${e.y}`;
    }
    d += ` L${p.pts[i].x},${p.pts[i].y}`;
  }
  return d;
};

export type Cam = { cx: number; cy: number; s: number };

export const boxCam = (ids: string[] | 'all', nodes: DNode[], W: number, H: number): Cam => {
  const list = ids === 'all' ? nodes : nodes.filter((n) => ids.includes(n.id));
  const x0 = Math.min(...list.map((n) => n.x)) - NODE_W / 2 - 110;
  const x1 = Math.max(...list.map((n) => n.x)) + NODE_W / 2 + 110;
  const y0 = Math.min(...list.map((n) => n.y)) - NODE_H / 2 - 130;
  const y1 = Math.max(...list.map((n) => n.y)) + NODE_H / 2 + 150;
  const s = Math.min(W / (x1 - x0), H / (y1 - y0), 1.05);
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, s };
};
