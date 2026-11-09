import { candidatePool } from './bench.js';
import { buildChain } from './logic/chain.js';
import { compareInternalExternal } from './logic/cost.js';
import { estimateSaudization } from './logic/nitaqat.js';
import { assertNoProtectedFields, toCandidate } from './logic/protected.js';
import { scoreCandidates } from './logic/scoring.js';
import type { CandidateScore, Employee, Position } from './types.js';

export interface Org { positions: Position[]; employees: Employee[] }

/**
 * Rank internal candidates for a vacancy. Takes raw employee rows (they carry nationality
 * and gender) and is the single place those rows are converted for scoring.
 */
export function rankCandidates(position: Position, org: Org, top = 3): CandidateScore[] {
  const pool = candidatePool(position, org.positions, org.employees);

  // Nationality and gender are removed here, BEFORE scoreCandidates is called — promotion
  // ranking must not be able to see them. See logic/protected.ts and __tests__/protected.test.ts.
  const candidates = pool.map(toCandidate);
  assertNoProtectedFields(candidates);

  return scoreCandidates(position, candidates)
    .sort((a, b) => b.total - a.total || a.employeeId - b.employeeId)
    .slice(0, top);
}

export function draftDecision(vacancyPosition: Position, chosen: Employee, org: Org) {
  const candidates = org.employees.map(toCandidate);
  const chosenCandidate = toCandidate(chosen);
  const chain = buildChain(vacancyPosition.id, chosen.id, { positions: org.positions, employees: candidates });
  const cost = compareInternalExternal(vacancyPosition, chosenCandidate);

  // Saudization scenario (nationality IS allowed here; this is not ranking).
  // Assumptions, stated in the UI: the person in the vacated role leaves; the chain ends in one
  // new entry-level hire who is Saudi, paid the median of the entry role's current pay, floored at 3,000.
  const before = estimateSaudization(org.employees);
  const entryStep = chain[chain.length - 1];
  const entryPay = org.employees.filter((e) => e.position_id === entryStep.positionId).map((e) => e.monthly_salary_sar).sort((a, b) => a - b);
  const median = entryPay.length ? entryPay[Math.floor(entryPay.length / 2)] : 3000;
  const remaining = org.employees.filter((e) => e.position_id !== vacancyPosition.id);
  const after = estimateSaudization([
    ...remaining,
    { nationality: 'saudi' as const, monthly_salary_sar: Math.max(3000, median) },
  ]);
  return { chain, cost, before, after };
}
