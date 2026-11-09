import { buildSeed } from './db/seedData.js';

/**
 * Demo store: everything lives in memory, seeded from the fictional company at startup.
 * No database. Restarting the server resets vacancies and decisions to empty.
 */
const seed = buildSeed();

export const departments = seed.departments;
export const positions = seed.positions;
export const employees = seed.employees;

export interface Vacancy { id: number; position_id: number; job_description: string; status: 'open' | 'decided'; created_at: string }
export interface Decision {
  id: number; vacancy_id: number; chosen_employee_id: number; chain: unknown[];
  internal_cost_sar: number; external_cost_sar: number; internal_days: number; external_days: number;
  saudization_before: number; saudization_after: number; created_at: string;
}
export const vacancies: Vacancy[] = [];
export const decisions: Decision[] = [];
let nextVacancy = 1;
let nextDecision = 1;
export const newVacancyId = () => nextVacancy++;
export const newDecisionId = () => nextDecision++;
