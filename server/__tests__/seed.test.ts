import { describe, expect, it } from 'vitest';
import { buildSeed, readyByPosition } from '../db/seedData.js';
import { estimateSaudization } from '../logic/nitaqat.js';
import { buildChain } from '../logic/chain.js';
import { toCandidate } from '../logic/protected.js';

const seed = buildSeed();

describe('seed data matches the brief', () => {
  it('60 employees, 5 departments, 4 levels', () => {
    expect(seed.employees).toHaveLength(60);
    expect(seed.departments).toHaveLength(5);
    expect(new Set(seed.positions.map((p) => p.level))).toEqual(new Set([1, 2, 3, 4]));
  });
  it('about 30% Saudi, and some Saudis under 3,000 SAR', () => {
    const saudi = seed.employees.filter((e) => e.nationality === 'saudi');
    expect(saudi.length / seed.employees.length).toBeCloseTo(0.3, 1);
    expect(saudi.filter((e) => e.monthly_salary_sar < 3000).length).toBeGreaterThan(0);
  });
  it('exactly 3 critical positions, each with no ready internal successor', () => {
    const critical = seed.positions.filter((p) => p.is_critical);
    expect(critical).toHaveLength(3);
    const ready = readyByPosition(seed);
    for (const p of critical) expect(ready.get(p.id)).toBe(0);
  });
  it('some non-critical position has exactly one ready successor', () => {
    const ready = readyByPosition(seed);
    expect([...seed.positions].some((p) => !p.is_critical && ready.get(p.id) === 1)).toBe(true);
  });
  it('a promotion chain ends in an entry-level vacancy', () => {
    const org = { positions: seed.positions, employees: seed.employees.map(toCandidate) };
    const target = seed.positions.find((p) => p.is_critical && p.level === 3)!;
    const chosen = seed.employees.find((e) => seed.positions.find((p) => p.id === e.position_id)!.parent_position_id === target.id)!;
    const chain = buildChain(target.id, chosen.id, org);
    const last = chain[chain.length - 1];
    expect(last.newHire).toBe(true);
    expect(seed.positions.find((p) => p.id === last.positionId)!.level).toBe(1);
    expect(chain.length).toBeGreaterThanOrEqual(3);
  });
  it('Saudization is computed from the rows', () => {
    const est = estimateSaudization(seed.employees);
    const counted = seed.employees.filter((e) => e.nationality === 'saudi' && e.monthly_salary_sar >= 3000).length;
    expect(est.countedSaudis).toBe(counted);
    expect(est.headcount).toBe(seed.employees.length);
  });
});
