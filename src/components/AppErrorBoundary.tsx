import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { trackEvent } from "../lib/analytics";

type AppErrorBoundaryProps = {
  children: React.ReactNode;
  resetKey?: string;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    trackEvent("app_runtime_error", {
      message: error.message,
      component_stack_present: Boolean(errorInfo.componentStack),
    });

    if (import.meta.env.DEV) {
      console.error("AppErrorBoundary caught an error", error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: AppErrorBoundaryProps) {
    if (
      this.state.hasError &&
      this.props.resetKey &&
      this.props.resetKey !== prevProps.resetKey
    ) {
      this.setState({ hasError: false });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[oklch(97%_0.018_116)] px-6">
        <div className="w-full max-w-lg rounded-[16px] border border-[oklch(84%_0.03_116)] bg-white p-8 text-center shadow-[0_28px_70px_rgba(24,42,31,0.16)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[12px] bg-[oklch(93%_0.055_25)] text-[oklch(45%_0.12_25)]">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="mt-6 text-3xl font-black tracking-normal text-[oklch(22%_0.035_145)]">
            Something went wrong
          </h1>
          <p className="mt-4 text-base leading-7 text-[oklch(42%_0.035_145)]">
            DayBridge hit an unexpected error on this screen. You can reload the page or head back to the landing page.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-[oklch(45%_0.09_153)] bg-[oklch(40%_0.1_153)] px-5 py-3 text-base font-bold text-white transition-colors hover:bg-[oklch(34%_0.105_153)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[oklch(76%_0.12_82)]"
            >
              <RefreshCw className="h-4 w-4" />
              Reload page
            </button>
            <button
              type="button"
              onClick={this.handleGoHome}
              className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-[oklch(78%_0.032_116)] bg-[oklch(99%_0.008_116)] px-5 py-3 text-base font-bold text-[oklch(25%_0.045_145)] transition-colors hover:border-[oklch(57%_0.08_153)] hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[oklch(76%_0.12_82)]"
            >
              Go to landing page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
