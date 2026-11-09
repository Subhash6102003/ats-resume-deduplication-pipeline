import type { Stage, PipelineContext } from '../core/index.js';
import type { Application, Fingerprint } from '../types.js';
import { computeAnchors } from '../fingerprint.js';
import { randomUUID } from 'crypto';

export const fingerprintStage: Stage<Application, Fingerprint> = {
  id: 'fingerprint',
  name: 'Compute Fingerprint',
  description: 'Hashes email, phone, content to produce identity anchors',
  async run(input: Application, ctx: PipelineContext): Promise<Fingerprint> {
    const anchors = computeAnchors(input);
    const canonicalId = randomUUID();

    ctx.logger.info(`Fingerprint computed`, {
      applicationId: input.applicationId,
      emailHash: anchors.emailHash,
      phoneHash: anchors.phoneHash,
    });

    return {
      applicationId: input.applicationId,
      canonicalId,
      emailHash: anchors.emailHash,
      phoneHash: anchors.phoneHash,
      contentSignature: anchors.contentSignature,
      similarityKey: anchors.nameKey,
    };
  },
};
