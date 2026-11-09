import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Employee, Position } from '../types.js';

// Spy on scoreCandidates but keep the real stub behind it.
const seen: unknown[] = [];
vi.mock('../logic/scoring.js', async (orig) => {
  const real = await orig<typeof import('../logic/scoring.js')>();
  return { scoreCandidates: vi.fn((p: Position, c: unknown[]) => { seen.push(structuredClone(c)); return real.scoreCandidates(p, c as never); }) };
});

import { rankCandidates } from '../analysis.js';
import { assertNoProtectedFields, PROTECTED_FIELDS, toCandidate } from '../logic/protected.js';
import { buildSeed } from '../db/seedData.js';
import { scoreCandidates } from '../logic/scoring.js';

function containsKey(value: unknown, keys: readonly string[]): string | null {
  if (value === null || typeof value !== 'object') return null;
  for (const [k, v] of Object.entries(value)) {
    if (keys.includes(k)) return k;
    const inner = containsKey(v, keys);
    if (inner) return inner;
  }
  return null;
}

beforeEach(() => { seen.length = 0; vi.mocked(scoreCandidates).mockClear(); });

describe('nationality and gender never reach scoreCandidates', () => {
  const seed = buildSeed();
  const org = { positions: seed.positions, employees: seed.employees };

  it('the seed rows really do carry both fields (so the test is meaningful)', () => {
    expect(seed.employees.every((e) => 'nationality' in e && 'gender' in e)).toBe(true);
  });

  it('every candidate handed to scoreCandidates is free of both fields, for every vacancy position', () => {
    for (const position of seed.positions.filter((p) => p.level > 1)) rankCandidates(position, org);
    expect(vi.mocked(scoreCandidates).mock.calls.length).toBeGreaterThan(0);
    for (const batch of seen) {
      expect(containsKey(batch, PROTECTED_FIELDS)).toBeNull();
      expect((batch as unknown[]).length).toBeGreaterThan(0);
    }
  });

  it('holds even if a row carries extra nested copies of the fields', () => {
    const position = seed.positions.find((p) => p.is_critical)!;
    const dirty = org.employees.map((e) => ({ ...e, meta: { nationality: e.nationality, gender: e.gender } })) as Employee[];
    rankCandidates(position, { positions: seed.positions, employees: dirty });
    for (const batch of seen) expect(containsKey(batch, PROTECTED_FIELDS)).toBeNull();
  });

  it('the guard itself fails loudly when a protected field is present (negative control)', () => {
    const e = seed.employees[0];
    expect(() => assertNoProtectedFields([toCandidate(e)])).not.toThrow();
    expect(() => assertNoProtectedFields([{ ...toCandidate(e), nationality: 'saudi' }])).toThrow(/nationality/);
    expect(() => assertNoProtectedFields([{ ...toCandidate(e), gender: 'female' }])).toThrow(/gender/);
    expect(() => assertNoProtectedFields([{ ...toCandidate(e), nested: { deep: { gender: 'x' } } }])).toThrow(/gender/);
  });

  it('the scoring stub rejects dirty input if someone bypasses the pipeline', () => {
    const e = seed.employees[0];
    const position = seed.positions[1];
    expect(() => scoreCandidates(position, [{ ...toCandidate(e), nationality: 'saudi' } as never])).toThrow(/nationality/);
  });
});
