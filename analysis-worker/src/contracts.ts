export type Static1Job = {
  analysisRunId: string;
  organizationId: string;
  websiteId: string;
  hostId: string;
  authorizedHosts: string[];
  profile: "STATIC-1";
  requestedAt: string;
};

export type QueueMessage = {
  id: string;
  job: Static1Job;
  attempt: number;
};

export interface AnalysisQueue {
  reserve(): Promise<QueueMessage | null>;
  complete(messageId: string): Promise<void>;
  fail(messageId: string, reason: string): Promise<void>;
}
