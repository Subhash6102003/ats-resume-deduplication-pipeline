/**
 * CanonicalIdentityStore
 *
 * Uses Union-Find (disjoint set union) to merge identities.
 * When two applications share any anchor (email hash, phone hash, or
 * content signature), they are merged into one canonical identity.
 */
export class CanonicalIdentityStore {
  private parent = new Map<string, string>();
  private appToCanonical = new Map<string, string>();

  private find(id: string): string {
    if (!this.parent.has(id)) {
      this.parent.set(id, id);
    }
    const p = this.parent.get(id)!;
    if (p !== id) {
      const root = this.find(p);
      this.parent.set(id, root);
      return root;
    }
    return p;
  }

  private union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) {
      if (rootA < rootB) {
        this.parent.set(rootB, rootA);
      } else {
        this.parent.set(rootA, rootB);
      }
    }
  }

  register(applicationId: string, anchors: string[]): string {
    this.find(applicationId);

    for (const anchor of anchors) {
      const existing = this.appToCanonical.get(anchor);
      if (existing) {
        const rootExisting = this.find(existing);
        const rootNew = this.find(applicationId);
        if (rootExisting !== rootNew) {
          this.parent.set(rootNew, rootExisting);
        }
      } else {
        this.appToCanonical.set(anchor, applicationId);
      }
    }

    return this.find(applicationId);
  }

  isDuplicate(applicationId: string): boolean {
    return this.find(applicationId) !== applicationId;
  }

  getCanonical(applicationId: string): string {
    return this.find(applicationId);
  }

  clear(): void {
    this.parent.clear();
    this.appToCanonical.clear();
  }
}
