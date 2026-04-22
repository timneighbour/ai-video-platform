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

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", background: "#080810", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "system-ui, sans-serif", color: "#ffffff", textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✦</div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.5rem", color: "#ffffff" }}>WIZ AI</h2>
          <p style={{ color: "#aaaaaa", marginBottom: "2rem", maxWidth: "320px", fontSize: "0.95rem" }}>Something went wrong. Please refresh to continue.</p>
          <button
            onClick={() => window.location.reload()}
            style={{ background: "linear-gradient(135deg, #c4a464, #d4b878, #c9a84c)", color: "#1a1200", border: "none", borderRadius: "9999px", padding: "0.75rem 2rem", fontWeight: 700, fontSize: "1rem", cursor: "pointer" }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
