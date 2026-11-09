import { Pipeline } from './core/index.js';
import type { Application, ScoredApplication, ShortlistResult } from './types.js';
import { CanonicalIdentityStore } from './identity-store.js';
import { fingerprintStage } from './stages/fingerprint.js';
import { createDedupStage } from './stages/dedup.js';
import { scoreStage } from './stages/score.js';
import { shortlist } from './stages/shortlist.js';
import { createLogger } from './core/index.js';
import type { Stage } from './core/index.js';

export interface ResumeProcessorOptions {
  maxShortlistSlots?: number;
}

export function createResumeProcessor(options: ResumeProcessorOptions = {}) {
  const { maxShortlistSlots = 5 } = options;
  const store = new CanonicalIdentityStore();
  const logger = createLogger('resume-processor');
  const ctx = {
    runId: 'batch',
    startedAt: new Date(),
    metadata: {},
    emit: () => undefined,
    logger,
  };

  const stages: Stage<unknown, unknown>[] = [
    fingerprintStage as Stage<unknown, unknown>,
    createDedupStage(store) as Stage<unknown, unknown>,
    scoreStage as Stage<unknown, unknown>,
  ];

  return {
    async processOne(application: Application): Promise<ScoredApplication> {
      const pipeline = new Pipeline<Application, ScoredApplication>('resume-single');
      const result = await pipeline.run(stages, application);

      if (result.status === 'failed') {
        throw new Error(`Failed to process application ${application.applicationId}: ${result.error}`);
      }

      return result.output!;
    },

    async processBatch(jobId: string, applications: Application[]): Promise<ShortlistResult> {
      const scored: ScoredApplication[] = [];

      for (const app of applications) {
        const pipeline = new Pipeline<Application, ScoredApplication>('resume-batch');
        const result = await pipeline.run(stages, app);

        if (result.status === 'success' && result.output) {
          scored.push(result.output);
        }
      }

      return shortlist(jobId, scored, maxShortlistSlots, ctx);
    },

    reset(): void {
      store.clear();
    },
  };
}
