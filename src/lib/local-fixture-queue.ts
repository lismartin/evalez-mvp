import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type LocalFixtureJob = {
  id: string;
  websiteId: string;
  organizationId: string;
  status: "queued" | "running" | "completed";
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: { passed: number; findings: number; blocked: number };
};

const queueDirectory = path.join(process.cwd(), "data");
const queuePath = path.join(queueDirectory, "local-fixture-queue.json");

async function readQueue(): Promise<LocalFixtureJob[]> {
  try {
    return JSON.parse(await readFile(queuePath, "utf8")) as LocalFixtureJob[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeQueue(jobs: LocalFixtureJob[]) {
  await mkdir(queueDirectory, { recursive: true });
  const temporaryPath = `${queuePath}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(jobs, null, 2), "utf8");
  await rename(temporaryPath, queuePath);
}

export async function enqueueLocalFixtureJob(websiteId: string, organizationId: string) {
  const jobs = await readQueue();
  const active = jobs.find((job) => job.websiteId === websiteId && (job.status === "queued" || job.status === "running"));
  if (active) return active;

  const job: LocalFixtureJob = {
    id: crypto.randomUUID(),
    websiteId,
    organizationId,
    status: "queued",
    createdAt: new Date().toISOString()
  };
  jobs.push(job);
  await writeQueue(jobs);
  return job;
}

export async function reserveLocalFixtureJob() {
  const jobs = await readQueue();
  const job = jobs.find((item) => item.status === "queued");
  if (!job) return null;
  job.status = "running";
  job.startedAt = new Date().toISOString();
  await writeQueue(jobs);
  return job;
}

export async function completeLocalFixtureJob(jobId: string, result: LocalFixtureJob["result"]) {
  const jobs = await readQueue();
  const job = jobs.find((item) => item.id === jobId);
  if (!job) return null;
  job.status = "completed";
  job.completedAt = new Date().toISOString();
  job.result = result;
  await writeQueue(jobs);
  return job;
}

export async function listLocalFixtureJobs(websiteId: string) {
  const jobs = await readQueue();
  return jobs.filter((job) => job.websiteId === websiteId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
