import type { ReactNode } from 'react';

export function PageHeader({ title, line }: { title: string; line: ReactNode }) {
  return (
    <header className="mb-gap">
      <h1 className="text-title m-0">{title}</h1>
      <p className="text-body text-muted m-0 mt-1">{line}</p>
    </header>
  );
}

type Tone = 'negative' | 'warning' | 'positive';
const tones: Record<Tone, string> = {
  negative: 'bg-pill-negative-bg text-pill-negative-ink',
  warning: 'bg-pill-warning-bg text-pill-warning-ink',
  positive: 'bg-pill-positive-bg text-pill-positive-ink',
};
export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center h-5 px-2 rounded-pill text-meta font-medium whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

/** number + muted 12px unit */
export function Num({ value, unit, className = '' }: { value: string; unit?: string; className?: string }) {
  return (
    <span className={`num ${className}`}>
      {value}{unit && <span className="text-meta text-muted ms-1">{unit}</span>}
    </span>
  );
}

export const btnBase = 'inline-flex items-center justify-center h-8 px-4 rounded-control text-body font-medium cursor-pointer disabled:opacity-60 disabled:cursor-default';
export const btnPrimary = `${btnBase} bg-primary text-surface border border-primary`;
export const btnSecondary = `${btnBase} bg-surface text-text border border-control hover:border-muted`;

export function Loading() { return <p className="text-body text-muted m-0">جارٍ التحميل…</p>; }
export function ErrorLine({ children }: { children: ReactNode }) { return <p className="text-body text-negative m-0">{children}</p>; }
