import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Optional custom fallback. If provided, replaces the default UI. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** When true, recovers silently after a crash without showing UI on next render. */
  silent?: boolean;
  /** Label used in console logs to help identify which boundary caught the error. */
  label?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error(`[ErrorBoundary${this.props.label ? `:${this.props.label}` : ""}]`, error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      return (
        <div className="min-h-[40vh] grid place-items-center bg-background text-foreground p-6">
          <div className="max-w-md text-center space-y-3">
            <h1 className="font-display text-2xl font-semibold">Algo deu errado</h1>
            <p className="text-sm text-muted-foreground break-words">
              {this.state.error.message}
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={this.reset}
                className="inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-border bg-surface text-foreground font-medium hover:bg-surface-elevated"
              >
                Tentar novamente
              </button>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-gradient-primary text-primary-foreground font-medium"
              >
                Recarregar
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
