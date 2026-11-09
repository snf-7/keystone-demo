import { useEffect, useState } from 'react';

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
export const pct = (n: number) => `${n.toFixed(1)}%`;

/** Arabic count phrase: 1 / 2 / 3-10 / 11+ */
export function countNoun(n: number, one: string, two: string, few: string, many: string) {
  if (n === 1) return one;
  if (n === 2) return two;
  return `${n} ${n <= 10 ? few : many}`;
}

export interface RadarPosition {
  id: number; title: string; department_id: number; department_name: string; level: 1 | 2 | 3 | 4;
  parent_position_id: number | null; is_critical: boolean; monthly_vacancy_cost_sar: number;
  holders: { id: number; full_name: string }[]; ready: number | null; open_vacancy_id: number | null;
}
export interface RadarData {
  company: string; positions: RadarPosition[];
  summary: { headcount: number; critical_count: number; critical_without_successor: number; critical_monthly_cost_sar: number };
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: init?.method ?? 'GET',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export function useApi<T>(path: string | null, method = 'GET') {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    let live = true;
    setData(null); setError(null);
    api<T>(path, { method }).then((d) => live && setData(d)).catch((e) => live && setError(String(e.message)));
    return () => { live = false; };
  }, [path, method]);
  return { data, error };
}
