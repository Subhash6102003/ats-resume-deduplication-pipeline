import type { Stage, PipelineContext } from '../core/index.js';
import type { Fingerprint, DedupResult } from '../types.js';
import type { CanonicalIdentityStore } from '../identity-store.js';

export function createDedupStage(store: CanonicalIdentityStore): Stage<Fingerprint, DedupResult> {
  const firstSeen = new Map<string, string>();

  return {
    id: 'dedup',
    name: 'Identity Deduplication',
    description: 'Runs Union-Find to collapse duplicate identities',
    async run(input: Fingerprint, ctx: PipelineContext): Promise<DedupResult> {
      const anchors = [input.emailHash, input.phoneHash, input.contentSignature].filter(
        (a) => a.length > 0,
      );

      const canonicalId = store.register(input.applicationId, anchors);
      const isDuplicate = store.isDuplicate(input.applicationId);

      let duplicateOf: string | undefined;
      if (isDuplicate) {
        duplicateOf = firstSeen.get(canonicalId);
        ctx.logger.warn(`Duplicate detected`, {
          applicationId: input.applicationId,
          canonicalId,
          duplicateOf,
        });
      } else {
        firstSeen.set(canonicalId, input.applicationId);
      }

      return {
        applicationId: input.applicationId,
        canonicalId,
        isDuplicate,
        duplicateOf,
        fingerprint: input,
      };
    },
  };
}
