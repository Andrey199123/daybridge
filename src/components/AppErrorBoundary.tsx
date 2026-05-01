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
      <div className="flex min-h-screen items-center justify-center bg-[#06111d] px-6 text-slate-100">
        <div className="w-full max-w-lg rounded-[24px] border border-[#223a5d] bg-[#081423] p-8 text-center shadow-[0_24px_80px_rgba(2,8,18,0.45)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[18px] border border-[#35547c] bg-[#0d1c31]">
            <AlertTriangle className="h-7 w-7 text-blue-200" />
          </div>
          <h1 className="mt-6 text-3xl font-semibold text-white">
            Something went wrong
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-400">
            DayBridge hit an unexpected error on this screen. You can reload the page or head back to the landing page.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-[#6b9fff] bg-[#4f86f7] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#6394ff]"
            >
              <RefreshCw className="h-4 w-4" />
              Reload page
            </button>
            <button
              type="button"
              onClick={this.handleGoHome}
              className="inline-flex items-center justify-center rounded-[14px] border border-[#29476f] bg-[#0d1a2c] px-5 py-3 text-sm font-medium text-slate-200 transition-colors hover:border-[#3a5d8f] hover:bg-[#13223a]"
            >
              Go to landing page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
