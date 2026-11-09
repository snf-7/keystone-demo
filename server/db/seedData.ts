import { candidatePool, isReady } from '../bench.js';
import { toCandidate } from '../logic/protected.js';
import type { Employee, Level, Nationality, Position } from '../types.js';

export const COMPANY = 'شركة الريادة للتوزيع';
export const DEPARTMENTS = ['المبيعات', 'المستودعات واللوجستيات', 'المشتريات وسلسلة الإمداد', 'المالية والإدارة', 'الموارد البشرية'];

// ---- tiny deterministic PRNG so the seed is reproducible -------------------------------------
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261108);
const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// ---- holders: [name, nationality, gender, optional "low" = Saudi paid under 3,000] -----------
type H = [string, 'S' | 'N', 'M' | 'F', boolean?];
const S = (n: string, g: 'M' | 'F' = 'M', low = false): H => [n, 'S', g, low];
const N = (n: string, g: 'M' | 'F' = 'M'): H => [n, 'N', g];

interface Def {
  key: string; title: string; dept: number; level: Level; parent: string | null;
  critical?: boolean; req: Record<string, number>; cost: number;
  pay: [number, number]; holders: H[];
  /** exact number of ready successors to engineer (levels 2-4) */
  ready?: number;
  /** hire-year range */
  hired: [number, number];
}

const DEFS: Def[] = [
  { key: 'gm', title: 'المدير العام', dept: 3, level: 4, parent: null, ready: 2, hired: [2010, 2013], pay: [48000, 48000], cost: 95000,
    req: { 'القيادة التنفيذية': 5, 'التخطيط الاستراتيجي': 5, 'إدارة الأداء المالي': 4, 'التفاوض': 4 },
    holders: [S('عبدالرحمن بن سعد الدوسري')] },

  // ---- level 3
  { key: 'sales_head', title: 'مدير المبيعات', dept: 0, level: 3, parent: 'gm', ready: 1, hired: [2012, 2015], pay: [26000, 30000], cost: 42000,
    req: { 'التخطيط التجاري': 5, 'قيادة الفريق': 4, 'تحليل المبيعات': 4, 'التفاوض': 4 },
    holders: [S('فهد بن ناصر الشمري')] },
  { key: 'log_head', title: 'مدير المستودعات واللوجستيات', dept: 1, level: 3, parent: 'gm', critical: true, ready: 0, hired: [2012, 2015], pay: [24000, 28000], cost: 46000,
    req: { 'تخطيط اللوجستيات': 5, 'قيادة الفريق': 4, 'إدارة المخزون': 4, 'إدارة الموردين': 3 },
    holders: [S('محمد بن علي القحطاني')] },
  { key: 'proc_head', title: 'مدير المشتريات', dept: 2, level: 3, parent: 'gm', ready: 2, hired: [2013, 2016], pay: [22000, 26000], cost: 38000,
    req: { 'استراتيجية التوريد': 5, 'التفاوض': 4, 'قيادة الفريق': 4, 'إدارة الموردين': 4 },
    holders: [N('سمير عبدالفتاح حسن')] },
  { key: 'fin_head', title: 'المدير المالي', dept: 3, level: 3, parent: 'gm', ready: 2, hired: [2013, 2016], pay: [28000, 32000], cost: 44000,
    req: { 'التخطيط المالي': 5, 'إعداد القوائم المالية': 4, 'قيادة الفريق': 4, 'الرقابة الداخلية': 4 },
    holders: [S('خالد إبراهيم المطيري')] },
  { key: 'hr_head', title: 'مدير الموارد البشرية', dept: 4, level: 3, parent: 'gm', ready: 2, hired: [2014, 2017], pay: [22000, 26000], cost: 36000,
    req: { 'استراتيجية رأس المال البشري': 5, 'قيادة الفريق': 4, 'أنظمة العمل السعودية': 4, 'إدارة الأداء': 4 },
    holders: [N('ياسر محمود الخطيب')] },

  // ---- level 2
  { key: 'sales_retail', title: 'مدير مبيعات التجزئة', dept: 0, level: 2, parent: 'sales_head', ready: 3, hired: [2015, 2018], pay: [13000, 16000], cost: 19000,
    req: { 'إدارة نقاط البيع': 4, 'قيادة الفريق': 3, 'تحليل المبيعات': 3 },
    holders: [S('سلطان عبدالله العتيبي')] },
  { key: 'sales_wholesale', title: 'مدير مبيعات الجملة', dept: 0, level: 2, parent: 'sales_head', critical: true, ready: 0, hired: [2015, 2018], pay: [14000, 17000], cost: 21000,
    req: { 'إدارة حسابات الجملة': 4, 'التفاوض': 4, 'قيادة الفريق': 3 },
    holders: [N('أيمن فاروق سليم')] },
  { key: 'wh_main', title: 'مشرف المستودع الرئيسي', dept: 1, level: 2, parent: 'log_head', ready: 1, hired: [2015, 2018], pay: [11000, 14000], cost: 17000,
    req: { 'تشغيل المستودعات': 4, 'قيادة الفريق': 3, 'إدارة المخزون': 3 },
    holders: [N('محمد إقبال حسين')] },
  { key: 'transport', title: 'مشرف النقل والتوزيع', dept: 1, level: 2, parent: 'log_head', ready: 2, hired: [2016, 2019], pay: [11000, 14000], cost: 16500,
    req: { 'جدولة النقل': 4, 'قيادة الفريق': 3, 'السلامة المرورية': 3 },
    holders: [S('نايف مشعل الحربي')] },
  { key: 'proc_local', title: 'رئيس قسم المشتريات', dept: 2, level: 2, parent: 'proc_head', ready: 2, hired: [2016, 2019], pay: [12000, 15000], cost: 17500,
    req: { 'التوريد المحلي': 4, 'التفاوض': 3, 'إدارة الموردين': 3 },
    holders: [N('هاني عبدالله الصبري')] },
  { key: 'inv_plan', title: 'رئيس التخطيط والمخزون', dept: 2, level: 2, parent: 'proc_head', ready: 2, hired: [2016, 2019], pay: [12000, 15000], cost: 17000,
    req: { 'تخطيط الطلب': 4, 'تحليل البيانات': 3, 'إدارة المخزون': 3 },
    holders: [S('منى عبدالعزيز الغامدي', 'F')] },
  { key: 'accounts', title: 'رئيس الحسابات', dept: 3, level: 2, parent: 'fin_head', critical: true, ready: 0, hired: [2014, 2017], pay: [14000, 17000], cost: 22000,
    req: { 'إقفال الحسابات الشهري': 4, 'المحاسبة العامة': 4, 'قيادة الفريق': 3 },
    holders: [N('عمر مصطفى النجار')] },
  { key: 'credit', title: 'رئيس الائتمان والتحصيل', dept: 3, level: 2, parent: 'fin_head', ready: 1, hired: [2016, 2019], pay: [12000, 15000], cost: 17500,
    req: { 'إدارة الائتمان': 4, 'التحصيل': 3, 'تحليل البيانات': 3 },
    holders: [N('راجيش كومار شارما')] },
  { key: 'personnel', title: 'رئيس شؤون الموظفين', dept: 4, level: 2, parent: 'hr_head', ready: 3, hired: [2016, 2019], pay: [11000, 14000], cost: 16000,
    req: { 'إدارة شؤون الموظفين': 4, 'أنظمة العمل السعودية': 3, 'قيادة الفريق': 3 },
    holders: [S('ريم صالح السبيعي', 'F')] },
  { key: 'recruit', title: 'رئيس التوظيف والتدريب', dept: 4, level: 2, parent: 'hr_head', ready: 1, hired: [2017, 2020], pay: [11000, 14000], cost: 16000,
    req: { 'التوظيف والاستقطاب': 4, 'تطوير الكفاءات': 3, 'قيادة الفريق': 3 },
    holders: [N('هبة أحمد عثمان', 'F')] },

  // ---- level 1 (entry)
  { key: 'sr_rep', title: 'مندوب مبيعات تجزئة', dept: 0, level: 1, parent: 'sales_retail', hired: [2019, 2025], pay: [3200, 4800], cost: 4500,
    req: { 'خدمة العملاء': 3, 'تحليل المبيعات': 2 },
    holders: [S('تركي ماجد البقمي'), S('بدر سعيد الحارثي'), N('أحمد سمير عبدالغني'), N('رفيق الإسلام محمد'), N('بلال حسن الأحمدي'), N('عمرو خالد فتحي')] },
  { key: 'sr_coord', title: 'منسق طلبات المبيعات', dept: 0, level: 1, parent: 'sales_retail', hired: [2019, 2025], pay: [3200, 4500], cost: 4500,
    req: { 'إدارة الطلبات': 3, 'خدمة العملاء': 3 },
    holders: [S('لجين عبدالله المالكي', 'F'), N('آية محمود شحاتة', 'F')] },
  { key: 'sw_rep', title: 'مندوب مبيعات جملة', dept: 0, level: 1, parent: 'sales_wholesale', hired: [2018, 2025], pay: [3600, 5200], cost: 5000,
    req: { 'التفاوض': 3, 'إدارة حسابات الجملة': 2 },
    holders: [S('عبدالإله فيصل العنزي'), N('كريم عادل السيد'), N('وسيم يوسف الحلبي'), N('حمزة عثمان إدريس')] },
  { key: 'wh_keeper', title: 'أمين مستودع', dept: 1, level: 1, parent: 'wh_main', hired: [2018, 2025], pay: [3000, 4200], cost: 4200,
    req: { 'إدارة المخزون': 3, 'تشغيل المستودعات': 2 },
    holders: [S('سعود ناصر القرني', 'M', true), N('عرفان أحمد شيخ'), N('أنيس الرحمن')] },
  { key: 'wh_forklift', title: 'مشغّل رافعة شوكية', dept: 1, level: 1, parent: 'wh_main', hired: [2018, 2025], pay: [2200, 3200], cost: 3800,
    req: { 'تشغيل المعدات': 3, 'السلامة المهنية': 3 },
    holders: [S('مشاري خالد الشهراني', 'M', true), N('ريزال سانتوس'), N('سوريش بابو'), N('ناصر علي الحداد')] },
  { key: 'tr_driver', title: 'سائق توزيع', dept: 1, level: 1, parent: 'transport', hired: [2018, 2025], pay: [2300, 3300], cost: 3800,
    req: { 'القيادة الآمنة': 3, 'تسليم الطلبات': 3 },
    holders: [S('ماجد عوض الجهني', 'M', true), N('عبدالرحمن شاه زمان'), N('محمد جاويد إقبال'), N('حسين الشيخ محمد'), N('أمجد فرحان')] },
  { key: 'tr_coord', title: 'منسق نقل', dept: 1, level: 1, parent: 'transport', hired: [2018, 2025], pay: [3200, 4200], cost: 4200,
    req: { 'جدولة النقل': 2, 'التواصل': 3 },
    holders: [N('هشام جمال الدين')] },
  { key: 'pl_spec', title: 'أخصائي مشتريات', dept: 2, level: 1, parent: 'proc_local', hired: [2018, 2025], pay: [4200, 6200], cost: 5500,
    req: { 'التوريد المحلي': 2, 'التفاوض': 2 },
    holders: [N('طارق رمضان عبدالحليم'), N('دينا سامي يوسف', 'F'), N('زياد محمود العلي')] },
  { key: 'pi_analyst', title: 'محلل مخزون', dept: 2, level: 1, parent: 'inv_plan', hired: [2019, 2025], pay: [4200, 6200], cost: 5500,
    req: { 'إدارة المخزون': 3, 'تحليل البيانات': 3 },
    holders: [N('مصطفى كمال الجندي'), N('سارة نبيل حنا', 'F'), N('فيصل أنور شيخ')] },
  { key: 'ac_acct', title: 'محاسب', dept: 3, level: 1, parent: 'accounts', hired: [2017, 2025], pay: [4800, 7000], cost: 6000,
    req: { 'المحاسبة العامة': 3, 'إقفال الحسابات الشهري': 2 },
    holders: [S('أروى سلمان العسيري', 'F'), N('هالة فتحي مرسي', 'F'), N('براكاش نايار')] },
  { key: 'ac_ap', title: 'موظف ذمم دائنة', dept: 3, level: 1, parent: 'accounts', hired: [2018, 2025], pay: [3600, 4800], cost: 4800,
    req: { 'المحاسبة العامة': 2, 'الدقة': 3 },
    holders: [N('شهاب الدين رحمان'), N('إيمان سعيد باوزير', 'F')] },
  { key: 'cr_collect', title: 'أخصائي تحصيل', dept: 3, level: 1, parent: 'credit', hired: [2018, 2025], pay: [3800, 5200], cost: 5000,
    req: { 'التحصيل': 3, 'إدارة الائتمان': 2 },
    holders: [S('نورة سعد الثبيتي', 'F'), N('عادل منصور صالح'), N('وائل سعد الدين')] },
  { key: 'pr_spec', title: 'أخصائي شؤون موظفين', dept: 4, level: 1, parent: 'personnel', hired: [2018, 2025], pay: [4000, 5500], cost: 5200,
    req: { 'إدارة شؤون الموظفين': 3, 'أنظمة العمل السعودية': 2 },
    holders: [N('رنا أحمد الخطيب', 'F'), N('أسامة بشير موسى')] },
  { key: 'pr_recep', title: 'موظف استقبال وإدارة', dept: 4, level: 1, parent: 'personnel', hired: [2019, 2025], pay: [2400, 3200], cost: 3800,
    req: { 'التواصل': 3, 'الدقة': 2 },
    holders: [S('هيفاء محمد الدوسري', 'F', true)] },
  { key: 'rt_recruit', title: 'أخصائي توظيف', dept: 4, level: 1, parent: 'recruit', hired: [2019, 2025], pay: [4200, 5600], cost: 5200,
    req: { 'التوظيف والاستقطاب': 3, 'التواصل': 3 },
    holders: [N('ليلى حسن الكردي', 'F')] },
  { key: 'rt_train', title: 'منسق تدريب', dept: 4, level: 1, parent: 'recruit', hired: [2019, 2025], pay: [3800, 5000], cost: 4800,
    req: { 'تطوير الكفاءات': 3, 'التواصل': 3 },
    holders: [N('جيهان إبراهيم عوض', 'F')] },
];

const ACHIEVEMENTS = [
  'خفّض زمن تسليم الطلبات 15% خلال 2024',
  'أنجز مشروع ترحيل نظام المخزون قبل الموعد',
  'حقّق أعلى نسبة تحصيل في الفريق لعام 2025',
  'درّب 6 زملاء جدد على الإجراءات التشغيلية',
  'اقترح تعديلاً وفّر 90 ألف ريال سنوياً في النقل',
  'حاصل على شهادة مهنية معتمدة في تخصصه',
  'قاد فريقاً مؤقتاً خلال موسم الذروة بنجاح',
  'خفّض أخطاء الفواتير إلى النصف خلال ستة أشهر',
];

export interface SeedBundle {
  company: string;
  departments: { id: number; name: string }[];
  positions: Position[];
  employees: Employee[];
}

export function buildSeed(): SeedBundle {
  const departments = DEPARTMENTS.map((name, i) => ({ id: i + 1, name }));
  const idOf = new Map<string, number>(DEFS.map((d, i) => [d.key, i + 1]));

  const positions: Position[] = DEFS.map((d) => ({
    id: idOf.get(d.key)!, title: d.title, department_id: d.dept + 1, level: d.level,
    parent_position_id: d.parent ? idOf.get(d.parent)! : null,
    is_critical: !!d.critical, required_skills: d.req, monthly_vacancy_cost_sar: d.cost,
  }));

  // ---- employees
  const employees: Employee[] = [];
  const extras = Object.keys(DEFS.reduce<Record<string, 1>>((a, d) => ({ ...a, ...Object.fromEntries(Object.keys(d.req).map((k) => [k, 1])) }), {}));
  for (const d of DEFS) {
    for (const [name, nat, g, low] of d.holders) {
      const skills: Record<string, number> = {};
      // people are about at the level of their own role, give or take one point
      for (const [k, v] of Object.entries(d.req)) skills[k] = clamp(v + int(-1, 0), 1, 5);
      for (let i = 0; i < 2; i++) skills[extras[int(0, extras.length - 1)]] ??= int(1, 3);
      const y = int(d.hired[0], d.hired[1]);
      const hire_date = `${y}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`;
      const perf = [];
      for (let yr = Math.max(y, 2023); yr <= 2025; yr++) perf.push({ year: yr, score: clamp(Math.round((3 + rnd() * 1.6) * 2) / 2, 1, 5) });
      const salary = low ? Math.round(int(2600, 2950) / 50) * 50 : Math.round(int(d.pay[0], d.pay[1]) / 50) * 50;
      const nationality: Nationality = nat === 'S' ? 'saudi' : 'non_saudi';
      employees.push({
        id: employees.length + 1, full_name: name, position_id: idOf.get(d.key)!, nationality,
        gender: g === 'M' ? 'male' : 'female', monthly_salary_sar: salary, hire_date,
        skills, performance: perf,
        achievements: rnd() < 0.3 ? [ACHIEVEMENTS[int(0, ACHIEVEMENTS.length - 1)]] : [],
      });
    }
  }

  // ---- engineer bench strength so the numbers on the radar are deliberate:
  // every role above entry level gets exactly `ready` ready successors; the 3 critical roles get 0.
  const posById = new Map(positions.map((p) => [p.id, p]));
  const pools = new Map<number, Employee[]>();
  for (const d of DEFS) if (d.ready !== undefined) {
    pools.set(idOf.get(d.key)!, candidatePool(posById.get(idOf.get(d.key)!)!, positions, employees));
  }
  // pass 1: make the chosen few ready
  for (const d of DEFS) if (d.ready) {
    const p = posById.get(idOf.get(d.key)!)!;
    const pool = pools.get(p.id)!;
    const best = [...pool].sort((a, b) => b.position_id - a.position_id || a.id - b.id).slice(0, d.ready);
    for (const e of best) {
      for (const [k, v] of Object.entries(p.required_skills)) e.skills[k] = Math.max(e.skills[k] ?? 0, v);
      const last = e.performance.slice(-2);
      last.forEach((x, i) => (x.score = i === 0 ? 4 : 4.5));
      if (!e.achievements.length) e.achievements = [ACHIEVEMENTS[(e.id * 3) % ACHIEVEMENTS.length]];
    }
  }
  // pass 2: everyone else in the pool is not ready — lower the role's signature skill (first skill listed)
  for (const d of DEFS) if (d.ready !== undefined) {
    const p = posById.get(idOf.get(d.key)!)!;
    const pool = pools.get(p.id)!;
    const sig = Object.keys(p.required_skills)[0];
    const need = d.ready;
    const ready = pool.filter((e) => isReady(p, toCandidate(e)));
    for (const e of pool) {
      if (ready.includes(e) && ready.indexOf(e) < need) continue;
      e.skills[sig] = Math.max(1, p.required_skills[sig] - 2);
    }
  }
  return { company: COMPANY, departments, positions, employees };
}

export function readyByPosition(b: SeedBundle) {
  const cands = b.employees.map(toCandidate);
  return new Map(b.positions.filter((p) => p.level > 1).map((p) => [p.id, candidatePool(p, b.positions, cands).filter((c) => isReady(p, c)).length]));
}
