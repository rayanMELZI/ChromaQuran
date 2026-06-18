/* In-process render job queue (server-only).
 * Holds job state in a module-level map (persists across requests in the long-running
 * Next server) and limits how many renders run at once so the box isn't overwhelmed.
 * For multi-server scale this swaps to Redis/BullMQ without touching the API or UI. */
import { renderJob, type RenderParams } from "./worker";

export type JobStatus = "queued" | "running" | "done" | "error";

export interface Job {
  id: string;
  status: JobStatus;
  progress: number; // 0..100
  stage: string; // current render stage id (prep/type/sync/encode/final)
  url?: string;
  name?: string;
  error?: string;
  params: RenderParams;
  origin: string;
  createdAt: number;
}

const jobs = new Map<string, Job>();
const queue: string[] = [];
let running = 0;
const MAX_CONCURRENT = Number(process.env.CQ_RENDER_CONCURRENCY || 1);
const MAX_JOBS = 80; // cap the in-memory map

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function createJob(params: RenderParams, origin: string): Job {
  const id = "job_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const job: Job = {
    id,
    status: "queued",
    progress: 0,
    stage: "prep",
    params,
    origin,
    createdAt: Date.now(),
  };
  jobs.set(id, job);
  queue.push(id);
  // trim oldest finished jobs
  if (jobs.size > MAX_JOBS) {
    const old = [...jobs.values()]
      .filter((j) => j.status === "done" || j.status === "error")
      .sort((a, b) => a.createdAt - b.createdAt);
    while (jobs.size > MAX_JOBS && old.length) jobs.delete(old.shift()!.id);
  }
  pump();
  return job;
}

function pump() {
  while (running < MAX_CONCURRENT && queue.length) {
    const id = queue.shift()!;
    const job = jobs.get(id);
    if (!job) continue;
    running++;
    job.status = "running";
    renderJob(job.params, job.origin, job.id, (p, stage) => {
      job.progress = Math.max(job.progress, Math.min(99, Math.round(p)));
      if (stage) job.stage = stage;
    })
      .then((res) => {
        job.status = "done";
        job.progress = 100;
        job.url = res.url;
        job.name = res.name;
      })
      .catch((e: unknown) => {
        job.status = "error";
        job.error = e instanceof Error ? e.message : String(e);
      })
      .finally(() => {
        running--;
        pump();
      });
  }
}
