import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console for debugging
    console.error("[ErrorBoundary] Caught error:", error, info.componentStack);
    // Forward to Sentry if available
    try {
      const w = window as any;
      if (w.Sentry?.captureException) {
        w.Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
      }
    } catch { /* Sentry not available */ }
  }

  handleReset = () => {
    // Reset the error boundary state so the tree can re-render
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "#080810",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            fontFamily: "system-ui, sans-serif",
            color: "#ffffff",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✦</div>
          <h2
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
              color: "#ffffff",
            }}
          >
            WIZ AI
          </h2>
          <p
            style={{
              color: "#aaaaaa",
              marginBottom: "2rem",
              maxWidth: "360px",
              fontSize: "0.95rem",
              lineHeight: 1.5,
            }}
          >
            Something went wrong loading this page. Try again — your work is
            saved automatically.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
            <button
              onClick={this.handleReset}
              style={{
                background: "linear-gradient(135deg, #c4a464, #d4b878, #c9a84c)",
                color: "#1a1200",
                border: "none",
                borderRadius: "9999px",
                padding: "0.75rem 2rem",
                fontWeight: 700,
                fontSize: "1rem",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "transparent",
                color: "#888",
                border: "1px solid #333",
                borderRadius: "9999px",
                padding: "0.75rem 2rem",
                fontWeight: 600,
                fontSize: "1rem",
                cursor: "pointer",
              }}
            >
              Refresh page
            </button>
          </div>
          {this.state.error && (
            <p
              style={{
                marginTop: "2rem",
                color: "#555",
                fontSize: "0.75rem",
                maxWidth: "480px",
                wordBreak: "break-word",
              }}
            >
              {this.state.error.message}
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
