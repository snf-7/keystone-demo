/** Only the brief's tokens exist: other font sizes / radii / colours are not available as utilities. */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent', current: 'currentColor',
      ground: 'var(--ground)', surface: 'var(--surface)', raised: 'var(--raised)', active: 'var(--active)',
      border: 'var(--border)', rule: 'var(--rule)', control: 'var(--control)',
      text: 'var(--text)', muted: 'var(--muted)', accent: 'var(--accent)',
      positive: 'var(--positive)', negative: 'var(--negative)', primary: 'var(--primary)',
      'pill-positive-bg': 'var(--pill-positive-bg)', 'pill-positive-ink': 'var(--pill-positive-ink)',
      'pill-negative-bg': 'var(--pill-negative-bg)', 'pill-negative-ink': 'var(--pill-negative-ink)',
      'pill-warning-bg': 'var(--pill-warning-bg)', 'pill-warning-ink': 'var(--pill-warning-ink)',
    },
    fontSize: {
      title: ['22px', { lineHeight: '30px', fontWeight: '600' }],
      section: ['16px', { lineHeight: '24px', fontWeight: '600' }],
      kpi: ['28px', { lineHeight: '36px', fontWeight: '400' }],
      body: ['14px', { lineHeight: '20px' }],
      meta: ['12px', { lineHeight: '16px' }],
    },
    borderRadius: { none: '0', card: 'var(--radius-card)', control: 'var(--radius-control)', nav: '8px', pill: '10px', sheet: '16px', track: '4px' },
    spacing: { 0: '0', px: '1px', 0.5: '2px', 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px', 6: '24px', 8: '32px', 12: '48px', gap: 'var(--gap)' },
    extend: { fontWeight: {} },
  },
  corePlugins: { boxShadow: false },
  plugins: [],
};
