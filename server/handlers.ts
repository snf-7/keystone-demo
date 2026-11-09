import { draftDecision, rankCandidates, type Org } from './analysis.js';
import { readyCount } from './bench.js';
import { COMPANY } from './db/seedData.js';
import { analyzeGaps } from './logic/gaps.js';
import { buildChain } from './logic/chain.js';
import { compareInternalExternal } from './logic/cost.js';
import { assertNoProtectedFields, toCandidate } from './logic/protected.js';
import { extractSkills } from './logic/skills.js';
import { decisions, departments, employees, newDecisionId, newVacancyId, positions, vacancies } from './store.js';
import type { Position } from './types.js';

/** Framework-free API logic, shared by the Express server and the static (GitHub Pages) build. */
export interface Result { status: number; body: unknown }
const ok = (body: unknown): Result => ({ status: 200, body });
const fail = (status: number, error: string): Result => ({ status, body: { error } });

function loadOrg() {
  return { departments, positions, employees };
}

function jobDescription(p: Position, dept: string) {
  const skills = Object.keys(p.required_skills);
  return [
    `نبحث عن ${p.title} في إدارة ${dept} بشركة الريادة للتوزيع.`,
    '',
    'المسؤوليات:',
    `- قيادة أعمال ${dept} وتحقيق مؤشرات الأداء المتفق عليها مع الإدارة العليا.`,
    '- رفع تقارير دورية بالنتائج والمخاطر، واقتراح التحسينات التشغيلية.',
    '- تطوير الفريق وضمان الاستمرارية في المهام الحرجة.',
    '',
    'المهارات المطلوبة:',
    ...skills.map((s) => `- ${s}`),
  ].join('\n');
}

export function getRadar(): Result {
  const org = loadOrg();
  const deptName = new Map(org.departments.map((d) => [d.id, d.name]));
  const cands = org.employees.map(toCandidate); // radar never needs nationality/gender
  const openByPos = new Map(vacancies.filter((v) => v.status === 'open').map((v) => [v.position_id, v.id]));
  const out = org.positions.map((p) => ({
    id: p.id, title: p.title, department_id: p.department_id, department_name: deptName.get(p.department_id),
    level: p.level, parent_position_id: p.parent_position_id, is_critical: p.is_critical,
    monthly_vacancy_cost_sar: p.monthly_vacancy_cost_sar,
    holders: org.employees.filter((e) => e.position_id === p.id).map((e) => ({ id: e.id, full_name: e.full_name })),
    ready: p.level > 1 ? readyCount(p, org.positions, cands) : null,
    open_vacancy_id: openByPos.get(p.id) ?? null,
  }));
  const critical = out.filter((p) => p.is_critical);
  return ok({
    company: COMPANY, positions: out,
    summary: {
      headcount: org.employees.length,
      critical_count: critical.length,
      critical_without_successor: critical.filter((p) => p.ready === 0).length,
      critical_monthly_cost_sar: critical.reduce((s, p) => s + p.monthly_vacancy_cost_sar, 0),
    },
  });
}

export function openVacancy(positionId: number): Result {
  const p = positions.find((x) => x.id === positionId);
  if (!p) return fail(404, 'position not found');
  const department_name = departments.find((d) => d.id === p.department_id)!.name;
  let vacancy = vacancies.find((v) => v.position_id === positionId && v.status === 'open');
  if (!vacancy) {
    vacancy = { id: newVacancyId(), position_id: positionId, job_description: jobDescription(p, department_name), status: 'open', created_at: new Date().toISOString() };
    vacancies.push(vacancy);
  }
  return ok({ position: { ...p, department_name }, vacancy });
}

export function analyzeVacancy(vacancyId: number, text?: string): Result {
  const vacancy = vacancies.find((v) => v.id === vacancyId);
  if (!vacancy) return fail(404, 'vacancy not found');
  if (typeof text === 'string') vacancy.job_description = text;
  const org = loadOrg();
  const position = org.positions.find((p) => p.id === vacancy.position_id)!;
  const titleOf = new Map(org.positions.map((p) => [p.id, p.title]));
  const strip = org.employees.map(toCandidate);
  assertNoProtectedFields(strip); // everything below this line works on stripped candidates
  const nameOf = new Map(org.employees.map((e) => [e.id, e.full_name]));
  const candidates = rankCandidates(position, org).map((s, i) => {
    const e = org.employees.find((x) => x.id === s.employeeId)!;
    const c = strip.find((x) => x.id === e.id)!;
    const plan = analyzeGaps(position, c);
    const cost = compareInternalExternal(position, c).internal;
    const vacated = org.positions.find((p) => p.id === e.position_id)!;
    // vacating the candidate's current role: does it have a ready internal successor?
    const impact = vacated.level === 1 ? 'low' : (() => {
      const n = readyCount(vacated, org.positions, strip);
      return n === 0 ? 'high' : n === 1 ? 'medium' : 'low';
    })();
    const chain = buildChain(position.id, e.id, { positions: org.positions, employees: strip }).map((st) => ({
      ...st,
      positionTitle: titleOf.get(st.positionId),
      employeeName: st.employeeId ? nameOf.get(st.employeeId) : null,
    }));
    return {
      rank: i + 1, employee_id: e.id, full_name: e.full_name, current_title: titleOf.get(e.position_id),
      total: s.total, breakdown: s.breakdown,
      gaps: plan.gaps, critical_met: plan.criticalMet, ready_in_weeks: plan.readyInWeeks, plan_steps: plan.steps,
      transfer_impact: impact, vacated_title: vacated.title,
      cost_sar: cost.costSar, days: cost.days, chain,
    };
  });
  return ok({ extracted_skills: extractSkills(vacancy.job_description), candidates });
}

export function decide(vacancyId: number, employeeId: number): Result {
  const vacancy = vacancies.find((v) => v.id === vacancyId);
  if (!vacancy) return fail(404, 'vacancy not found');
  const org = loadOrg();
  const position = org.positions.find((p) => p.id === vacancy.position_id)!;
  const chosen = org.employees.find((e) => e.id === employeeId);
  if (!chosen) return fail(400, 'employee not found');
  const { chain, cost, before, after } = draftDecision(position, chosen, org as Org);
  const titleOf = new Map(org.positions.map((p) => [p.id, p.title]));
  const nameOf = new Map(org.employees.map((e) => [e.id, e.full_name]));
  const snapshot = chain.map((s) => ({ ...s, positionTitle: titleOf.get(s.positionId), employeeName: s.employeeId ? nameOf.get(s.employeeId) : null }));
  const d = {
    id: newDecisionId(), vacancy_id: vacancy.id, chosen_employee_id: chosen.id, chain: snapshot,
    internal_cost_sar: cost.internal.costSar, external_cost_sar: cost.external.costSar,
    internal_days: cost.internal.days, external_days: cost.external.days,
    saudization_before: before.percentage, saudization_after: after.percentage, created_at: new Date().toISOString(),
  };
  decisions.push(d);
  vacancy.status = 'decided';
  return ok({ id: d.id, vacancy_id: vacancy.id });
}

export function getDecision(vacancyId: number): Result {
  const d = [...decisions].reverse().find((x) => x.vacancy_id === vacancyId);
  const v = vacancies.find((x) => x.id === vacancyId);
  if (!d || !v) return fail(404, 'no decision for this vacancy');
  const p = positions.find((x) => x.id === v.position_id)!;
  const e = employees.find((x) => x.id === d.chosen_employee_id)!;
  return ok({
    id: d.id, vacancy_id: d.vacancy_id,
    position: { id: p.id, title: p.title, department: departments.find((x) => x.id === p.department_id)!.name, monthly_vacancy_cost_sar: p.monthly_vacancy_cost_sar },
    chosen: { id: e.id, full_name: e.full_name, current_title: positions.find((x) => x.id === e.position_id)!.title },
    chain: d.chain,
    internal: { cost_sar: d.internal_cost_sar, days: d.internal_days },
    external: { cost_sar: d.external_cost_sar, days: d.external_days },
    saudization: { before: d.saudization_before, after: d.saudization_after },
  });
}
