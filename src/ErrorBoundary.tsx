import { Component, type ReactNode } from 'react';

export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return <pre dir="ltr" style={{ margin: 16, padding: 12, border: '1px solid var(--negative)', whiteSpace: 'pre-wrap', fontSize: 12 }}>{String(this.state.error.stack ?? this.state.error)}</pre>;
  }
}
