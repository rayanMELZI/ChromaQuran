"use client";

/* Custom global error boundary. Self-contained (its own <html>/<body>, no app context or
 * fonts) so Next can prerender it cleanly — the built-in default fails to prerender under
 * Node 22 (`useContext` null), which broke the production Docker/CI build. */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0e1a",
          color: "#e8eef6",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          <h2 style={{ margin: "0 0 8px", fontWeight: 600 }}>Something went wrong</h2>
          <p style={{ margin: "0 0 18px", opacity: 0.6 }}>An unexpected error occurred.</p>
          <button
            onClick={() => reset()}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid #2a3550",
              background: "#16203a",
              color: "#e8eef6",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
