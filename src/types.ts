export interface Application {
  applicationId: string;
  jobId: string;
  candidateName: string;
  email: string;
  phone: string;
  resumeText: string;
  submittedAt: Date;
}

export interface Fingerprint {
  applicationId: string;
  canonicalId: string;
  emailHash: string;
  phoneHash: string;
  contentSignature: string;
  similarityKey: string;
}

export interface DedupResult {
  applicationId: string;
  canonicalId: string;
  isDuplicate: boolean;
  duplicateOf?: string;
  fingerprint: Fingerprint;
}

export interface ScoredApplication extends DedupResult {
  score: number;
  signals: string[];
}

export interface ShortlistResult {
  jobId: string;
  shortlisted: ScoredApplication[];
  rejected: ScoredApplication[];
  duplicatesBlocked: number;
  totalProcessed: number;
  slotsUsed: number;
  slotsMax: number;
}
