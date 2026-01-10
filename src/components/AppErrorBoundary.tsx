import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[AppErrorBoundary] Unhandled error", error, info);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-background text-foreground">
        <div className="w-full max-w-md glass-strong rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-destructive/15 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold">Something went wrong</h1>
              <p className="text-sm text-muted-foreground">
                A screen crashed. Reload the page to continue.
              </p>
            </div>
          </div>

          <pre className="mt-4 max-h-56 overflow-auto text-xs text-muted-foreground whitespace-pre-wrap break-words">
            {this.state.error.message}
          </pre>

          <button
            type="button"
            onClick={this.handleReload}
            className="mt-4 w-full btn-gold rounded-xl py-2.5 flex items-center justify-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reload
          </button>
        </div>
      </div>
    );
  }
}
