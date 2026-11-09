import type { RadarPosition } from '../lib';

export const NODE_W = 216;
export const NODE_H = 64;
const COL_GAP = 48;
const ROW_GAP = 10;

/**
 * Layered tree, root on the right, children to the left (RTL reading order).
 * Leaves take consecutive rows; a parent sits centred on its children.
 */
export function layout(positions: RadarPosition[]) {
  const kids = new Map<number | null, RadarPosition[]>();
  for (const p of positions) {
    const k = kids.get(p.parent_position_id) ?? [];
    k.push(p); kids.set(p.parent_position_id, k);
  }
  const pos = new Map<number, { x: number; y: number }>();
  let row = 0;
  const place = (p: RadarPosition): number => {
    const children = kids.get(p.id) ?? [];
    let y: number;
    if (!children.length) y = row++ * (NODE_H + ROW_GAP);
    else {
      const ys = children.map(place);
      y = (ys[0] + ys[ys.length - 1]) / 2;
    }
    pos.set(p.id, { x: -(4 - p.level) * (NODE_W + COL_GAP), y });
    return y;
  };
  (kids.get(null) ?? []).forEach(place);
  const edges = positions.filter((p) => p.parent_position_id).map((p) => ({ id: `e${p.id}`, source: String(p.parent_position_id), target: String(p.id) }));
  return { pos, edges };
}
