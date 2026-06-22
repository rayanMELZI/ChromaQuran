/* In-process daily scheduler. Started once from instrumentation.ts on server boot.
 * A minute ticker runs any due schedule; if the server was down at the scheduled time
 * it simply runs later the same day (the claim is keyed to the local date, not the clock).
 * Server-only (Node runtime). */
let started = false;

export function startAutomationScheduler(): void {
  if (started) return;
  started = true;

  const tick = async () => {
    try {
      const { runDueAutomations } = await import("./runner");
      await runDueAutomations();
    } catch (e) {
      console.error("[automation] tick failed:", e);
    }
  };

  setTimeout(tick, 15_000); // shortly after boot (catch a missed 10 AM)
  setInterval(tick, 60_000); // then every minute
  console.log("[automation] scheduler started — checking every 60s");
}
