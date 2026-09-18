import type { FloorPoint } from './types';

export const FLOOR = { x: [-9, 9] as const, z: [-4.8, 12] as const };
// Insets keep the 74 px pet target fully on a narrow 390 px screen.
export const WALK = { x: [-2.2, 2.2] as const, z: [-3.65, 7.15] as const };
const OBSTACLES = [
  { x: 2.28, z: 0.10, rx: 1.12, rz: 0.89 }, // table
  { x: -2.05, z: 0.20, rx: 1.16, rz: 1.03 }, // cushion
  { x: -2.8, z: -3.65, rx: 0.78, rz: 0.8 }, // plant
] as const;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const valid = (p: FloorPoint) => Number.isFinite(p.x) && Number.isFinite(p.z);
export type NavigationOptions = { tableInstalled?: boolean; toiletInstalled?: boolean };

function obstacles(options: NavigationOptions) {
  return [
    ...(options.tableInstalled ?? true ? [OBSTACLES[0]] : []),
    OBSTACLES[1], OBSTACLES[2],
    ...(options.toiletInstalled ? [{ x: -2.6, z: -1.62, rx: 0.85, rz: 0.85 }] : []),
  ];
}

export function isFree(p: FloorPoint, options: NavigationOptions = {}): boolean {
  return valid(p) && p.x >= WALK.x[0] && p.x <= WALK.x[1] && p.z >= WALK.z[0] && p.z <= WALK.z[1]
    && obstacles(options).every((o) => ((p.x - o.x) / o.rx) ** 2 + ((p.z - o.z) / o.rz) ** 2 >= 1);
}

export function nearestFree(raw: FloorPoint, options: NavigationOptions = {}): FloorPoint | null {
  if (!valid(raw)) return null;
  const goal = { x: clamp(raw.x, ...WALK.x), z: clamp(raw.z, ...WALK.z) };
  if (isFree(goal, options)) return goal;
  let nearest: FloorPoint | null = null;
  let distance = Infinity;
  // Deterministic nearest walkable point for furniture and screen edges.
  for (let z = WALK.z[0]; z <= WALK.z[1]; z += 0.1) {
    for (let x = WALK.x[0]; x <= WALK.x[1]; x += 0.1) {
      const point = { x, z };
      const d = Math.hypot(x - goal.x, z - goal.z);
      if (d < distance && isFree(point, options)) { nearest = point; distance = d; }
    }
  }
  return nearest;
}

export function clearLine(a: FloorPoint, b: FloorPoint, options: NavigationOptions = {}): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(a.x - b.x, a.z - b.z) / 0.06));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (!isFree({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }, options)) return false;
  }
  return true;
}

export function route(start: FloorPoint, requested: FloorPoint, options: NavigationOptions = {}): FloorPoint[] {
  const goal = nearestFree(requested, options);
  if (!goal || !isFree(start, options)) return [];
  if (clearLine(start, goal, options)) return [goal];
  const spacing = 0.25;
  const cols = Math.ceil((WALK.x[1] - WALK.x[0]) / spacing);
  const rows = Math.ceil((WALK.z[1] - WALK.z[0]) / spacing);
  const width = cols + 1;
  const nodes: (FloorPoint | null)[] = [];
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
    const p = { x: WALK.x[0] + (i / cols) * (WALK.x[1] - WALK.x[0]), z: WALK.z[0] + (j / rows) * (WALK.z[1] - WALK.z[0]) };
    nodes.push(isFree(p, options) ? p : null);
  }
  const closest = (p: FloorPoint) => {
    let index = -1; let distance = Infinity;
    nodes.forEach((n, i) => { if (n && clearLine(p, n, options)) { const d = Math.hypot(n.x - p.x, n.z - p.z); if (d < distance) { distance = d; index = i; } } });
    return index;
  };
  const source = closest(start), target = closest(goal);
  if (source < 0 || target < 0) return [];
  const cost = new Float64Array(nodes.length).fill(Infinity);
  const previous = new Int32Array(nodes.length).fill(-1);
  const open = new Set([source]); cost[source] = 0;
  while (open.size) {
    let best = -1; let score = Infinity;
    for (const i of open) {
      const p = nodes[i]!; const t = nodes[target]!;
      const f = cost[i] + Math.hypot(p.x - t.x, p.z - t.z);
      if (f < score) { best = i; score = f; }
    }
    if (best === target) break;
    open.delete(best);
    const x = best % width, z = Math.floor(best / width);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!(dx || dz)) continue;
      const xx = x + dx, zz = z + dz;
      if (xx < 0 || xx > cols || zz < 0 || zz > rows) continue;
      const to = zz * width + xx;
      if (!nodes[to] || !clearLine(nodes[best]!, nodes[to]!, options)) continue;
      const distance = Math.hypot(nodes[best]!.x - nodes[to]!.x, nodes[best]!.z - nodes[to]!.z);
      if (cost[best] + distance < cost[to]) { cost[to] = cost[best] + distance; previous[to] = best; open.add(to); }
    }
  }
  if (!Number.isFinite(cost[target])) return [];
  const reverse: FloorPoint[] = [];
  for (let at = target; at !== source && at >= 0; at = previous[at]) reverse.push(nodes[at]!);
  reverse.reverse(); reverse.push(goal);
  // Remove grid corners that can be traversed safely in a straight line.
  const path: FloorPoint[] = [];
  let here = start;
  while (reverse.length) {
    let far = 0;
    for (let i = 0; i < reverse.length; i++) { if (clearLine(here, reverse[i], options)) far = i; else break; }
    if (!clearLine(here, reverse[far], options)) return [];
    here = reverse[far]; path.push(here); reverse.splice(0, far + 1);
  }
  return path;
}
