/* Next.js instrumentation hook — runs once when the server process starts.
 * We use it to launch the in-process automation scheduler (daily auto-post). */
export async function register() {
  // Only in the Node.js server runtime (not Edge/middleware, not at build time).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startAutomationScheduler } = await import("@/lib/automation/scheduler");
  startAutomationScheduler();
}
