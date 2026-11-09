import type { PipelineContext } from '../core/index.js';
import type { ScoredApplication, ShortlistResult } from '../types.js';

export function shortlist(
  jobId: string,
  applications: ScoredApplication[],
  maxSlots: number,
  ctx: PipelineContext,
): ShortlistResult {
  const unique = applications.filter((a) => !a.isDuplicate);
  const duplicates = applications.filter((a) => a.isDuplicate);

  const sorted = [...unique].sort((a, b) => b.score - a.score);

  const shortlisted = sorted.slice(0, maxSlots);
  const rejected = [...sorted.slice(maxSlots), ...duplicates];

  ctx.logger.info(`Shortlist complete`, {
    jobId,
    total: applications.length,
    unique: unique.length,
    duplicatesBlocked: duplicates.length,
    shortlisted: shortlisted.length,
  });

  return {
    jobId,
    shortlisted,
    rejected,
    duplicatesBlocked: duplicates.length,
    totalProcessed: applications.length,
    slotsUsed: shortlisted.length,
    slotsMax: maxSlots,
  };
}
