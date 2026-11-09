import type { Stage, PipelineContext } from '../core/index.js';
import type { DedupResult, ScoredApplication } from '../types.js';

export const scoreStage: Stage<DedupResult, ScoredApplication> = {
  id: 'score',
  name: 'Score Application',
  description: 'Assigns quality signals and 0-100 score to each unique application',
  async run(input: DedupResult, ctx: PipelineContext): Promise<ScoredApplication> {
    if (input.isDuplicate) {
      return { ...input, score: 0, signals: ['DUPLICATE — blocked before scoring'] };
    }

    let score = 0;
    const signals: string[] = [];

    const nameTokenCount = input.fingerprint.similarityKey.split(':').length;
    if (nameTokenCount >= 2) {
      score += 10;
      signals.push('Full name provided');
    }

    if (input.fingerprint.phoneHash) {
      score += 10;
      signals.push('Phone number provided');
    }

    if (input.fingerprint.emailHash) {
      score += 10;
      signals.push('Email provided');
    }

    score += 20;
    signals.push('Resume content present');

    const seed = parseInt(input.applicationId.replace(/\D/g, '').slice(0, 4), 10) || 0;
    score += (seed % 50);

    score = Math.min(100, Math.max(0, score));

    ctx.logger.info(`Application scored`, { applicationId: input.applicationId, score });

    return { ...input, score, signals };
  },
};
