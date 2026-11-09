export type Nationality = 'saudi' | 'non_saudi';
export type Level = 1 | 2 | 3 | 4;

export interface Department { id: number; name: string }

export interface Position {
  id: number;
  title: string;
  department_id: number;
  level: Level;
  parent_position_id: number | null;
  is_critical: boolean;
  required_skills: Record<string, number>;
  monthly_vacancy_cost_sar: number;
}

export interface PerformanceEntry { year: number; score: number }

export interface Employee {
  id: number;
  full_name: string;
  position_id: number;
  nationality: Nationality;
  gender: string;
  monthly_salary_sar: number;
  hire_date: string; // YYYY-MM-DD
  skills: Record<string, number>;
  performance: PerformanceEntry[];
  achievements: string[];
}

/**
 * What the scoring side is allowed to see about a person.
 * An allowlist, not Omit<>: a column added to `employees` later does not leak by default.
 * No nationality, no gender, and no name either (names are proxies for both) — score by id,
 * then look the name up after ranking.
 */
export type Candidate = Pick<
  Employee,
  'id' | 'position_id' | 'monthly_salary_sar' | 'hire_date' | 'skills' | 'performance' | 'achievements'
>;

export interface ScoreFactor { factor: string; points: number; evidence: string }
export interface CandidateScore { employeeId: number; total: number; breakdown: ScoreFactor[] }

export interface ChainStep {
  positionId: number;
  /** null when the step is filled by an external hire */
  employeeId: number | null;
  newHire: boolean;
}

export interface CostComparison {
  internal: { costSar: number; days: number };
  external: { costSar: number; days: number };
}

export interface SaudizationEstimate {
  percentage: number;
  countedSaudis: number;
  headcount: number;
}
