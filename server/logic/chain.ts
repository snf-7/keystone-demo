import type { Candidate, ChainStep, Position } from '../types.js';

export interface OrgSnapshot { positions: Position[]; employees: Candidate[] }

/**
 * STUB — MOCK DATA. Replace with the real chain logic.
 *
 * Contract: steps[0] is the vacancy filled by the chosen employee; each next step is the
 * role that person vacated, filled by someone one level down; the last step is an entry-level
 * role (level 1) with employeeId = null and newHire = true.
 *
 * NOTE: the spec signature is buildChain(positionId, chosenEmployeeId). The stub takes a third
 * `org` argument only so its mock output refers to real rows; the real implementation can load
 * whatever it needs.
 */
export function buildChain(positionId: number, chosenEmployeeId: number, org: OrgSnapshot): ChainStep[] {
  const byId = new Map(org.positions.map((p) => [p.id, p]));
  const chosen = org.employees.find((e) => e.id === chosenEmployeeId);
  if (!chosen) throw new Error(`employee ${chosenEmployeeId} not found`);

  const steps: ChainStep[] = [{ positionId, employeeId: chosen.id, newHire: false }];
  let vacated = chosen.position_id;
  const used = new Set([chosen.id]);

  while ((byId.get(vacated)?.level ?? 1) > 1) {
    // MOCK: first person reporting into the vacated role
    const next = org.employees.find(
      (e) => !used.has(e.id) && byId.get(e.position_id)?.parent_position_id === vacated,
    );
    if (!next) break;
    used.add(next.id);
    steps.push({ positionId: vacated, employeeId: next.id, newHire: false });
    vacated = next.position_id;
  }
  steps.push({ positionId: vacated, employeeId: null, newHire: true });
  return steps;
}
