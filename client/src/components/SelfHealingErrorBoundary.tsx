/**
 * SelfHealingErrorBoundary.tsx — Wiz AI Self-Healing Error Boundary
 *
 * Catches React render errors and shows a branded recovery screen
 * with a "Try Again" button instead of the raw crash screen.
 * The "Try Again" button resets the error boundary so the component
 * tree re-mounts from scratch — resuming from the last saved state.
 */

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Optional fallback UI. Defaults to the Wiz AI branded recovery screen. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SelfHealingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[SelfHealingErrorBoundary] Caught error:", error, info);
    // Log to Sentry if available
    try {
      const Sentry = (window as any).__SENTRY__;
      if (Sentry?.captureException) {
        Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
      }
    } catch {
      // Sentry not available — ignore
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.reset);
      }

      return (
        <DefaultRecoveryScreen
          error={this.state.error}
          onReset={this.reset}
        />
      );
    }

    return this.props.children;
  }
}

function DefaultRecoveryScreen({
  error,
  onReset,
}: {
  error: Error | null;
  onReset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px",
        padding: "32px",
        fontFamily: "Inter, sans-serif",
        color: "#fff",
      }}
    >
      {/* Wiz AI star icon */}
      <svg
        width="56"
        height="56"
        viewBox="0 0 24 24"
        fill="white"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 2L13.09 8.26L19 9L13.09 9.74L12 16L10.91 9.74L5 9L10.91 8.26L12 2Z" />
      </svg>

      <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0 }}>WIZ AI</h1>

      <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.7)", textAlign: "center", maxWidth: "380px", margin: 0 }}>
        Something went wrong loading this page. Your work is saved automatically.
      </p>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={onReset}
          style={{
            padding: "10px 24px",
            background: "linear-gradient(135deg, #c9a227, #e8c547)",
            color: "#1a1200",
            border: "none",
            borderRadius: "24px",
            fontWeight: 700,
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "10px 24px",
            background: "transparent",
            color: "rgba(255,255,255,0.7)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "24px",
            fontWeight: 600,
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Refresh page
        </button>
      </div>

      {error && (
        <p
          style={{
            fontSize: "11px",
            color: "rgba(255,255,255,0.25)",
            fontFamily: "monospace",
            maxWidth: "480px",
            textAlign: "center",
            wordBreak: "break-all",
          }}
        >
          {error.message}
        </p>
      )}
    </div>
  );
}

export default SelfHealingErrorBoundary;
