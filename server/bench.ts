import type { Candidate, Position } from './types.js';

type Person = { id: number; position_id: number };

/**
 * Who could plausibly step into `position`: people in the roles that report into it
 * (one level down). If that is fewer than 3, widen to roles two levels down.
 * Generic so it works on raw rows or on stripped candidates.
 */
export function candidatePool<E extends Person>(
  position: Position,
  positions: Position[],
  people: E[],
): E[] {
  const childIds = new Set(positions.filter((p) => p.parent_position_id === position.id).map((p) => p.id));
  let pool = people.filter((e) => childIds.has(e.position_id));
  if (pool.length < 3) {
    const grandIds = new Set(positions.filter((p) => p.parent_position_id !== null && childIds.has(p.parent_position_id)).map((p) => p.id));
    pool = pool.concat(people.filter((e) => grandIds.has(e.position_id)));
  }
  return pool;
}

/**
 * Org-chart gate ("ready successor"): meets every required skill within one point, and the
 * last two performance scores average >= 3.5.
 *
 * This is a coarse bench-strength flag for the radar pills ONLY. It is not the ranking
 * (that is scoring.ts) and it only ever sees stripped candidates.
 */
export function isReady(position: Position, c: Candidate): boolean {
  const skillsOk = Object.entries(position.required_skills).every(([s, lvl]) => (c.skills[s] ?? 0) >= lvl - 1);
  const last = [...c.performance].sort((a, b) => b.year - a.year).slice(0, 2);
  const perf = last.length ? last.reduce((s, p) => s + p.score, 0) / last.length : 0;
  return skillsOk && perf >= 3.5;
}

export function readyCount(position: Position, positions: Position[], candidates: Candidate[]): number {
  return candidatePool(position, positions, candidates).filter((c) => isReady(position, c)).length;
}
