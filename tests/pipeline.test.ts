import { describe, it, expect } from 'vitest';
import { createResumeProcessor } from '../src/pipeline.js';
import type { Application } from '../src/types.js';

const JOB_ID = 'senior-sde-2024';
let seq = 0;

function makeApp(overrides: Partial<Application> = {}): Application {
  seq++;
  return {
    applicationId: `app-${seq}`,
    jobId: JOB_ID,
    candidateName: `Candidate ${seq}`,
    email: `candidate${seq}@example.com`,
    phone: `+91 98765 ${String(seq).padStart(5, '0')}`,
    resumeText: `Experienced software engineer with 5+ years at FAANG. GitHub: github.com/cand${seq}. Skills: TypeScript, React, Node.js, Redis, Postgres. Achieved 40% performance improvement.`,
    submittedAt: new Date(),
    ...overrides,
  };
}

describe('S2 — Resume Dedup Pipeline', () => {
  describe('Union-Find Identity Store', () => {
    it('same application ID → not a duplicate of itself', async () => {
      const processor = createResumeProcessor();
      const app = makeApp();
      const result = await processor.processOne(app);

      expect(result.isDuplicate).toBe(false);
      expect(result.score).toBeGreaterThan(0);
    });

    it('detects duplicate by same email', async () => {
      const processor = createResumeProcessor();
      const sharedEmail = 'alice@example.com';

      const app1 = makeApp({ email: sharedEmail, candidateName: 'Alice Johnson' });
      const app2 = makeApp({ email: sharedEmail, candidateName: 'Alice J.' });

      const r1 = await processor.processOne(app1);
      const r2 = await processor.processOne(app2);

      expect(r1.isDuplicate).toBe(false);
      expect(r2.isDuplicate).toBe(true);
    });

    it('detects duplicate by same phone', async () => {
      const processor = createResumeProcessor();
      const sharedPhone = '+91 98765 43210';

      const app1 = makeApp({ phone: sharedPhone, email: 'email1@a.com' });
      const app2 = makeApp({ phone: sharedPhone, email: 'email2@b.com' });

      const r1 = await processor.processOne(app1);
      const r2 = await processor.processOne(app2);

      expect(r1.isDuplicate).toBe(false);
      expect(r2.isDuplicate).toBe(true);
    });

    it('detects duplicate by same resume content', async () => {
      const processor = createResumeProcessor();
      const sharedResume = 'I am an experienced developer with 10 years of TypeScript. '.repeat(20);

      const app1 = makeApp({ resumeText: sharedResume, email: 'x@a.com', phone: '+91 11111 11111' });
      const app2 = makeApp({ resumeText: sharedResume, email: 'y@b.com', phone: '+91 22222 22222' });

      const r1 = await processor.processOne(app1);
      const r2 = await processor.processOne(app2);

      expect(r1.isDuplicate).toBe(false);
      expect(r2.isDuplicate).toBe(true);
    });
  });

  describe('Shortlist logic', () => {
    it('never lets a duplicate consume a shortlist slot', async () => {
      const processor = createResumeProcessor({ maxShortlistSlots: 5 });
      const sharedEmail = 'duplicate@example.com';

      const apps = [
        makeApp({ email: sharedEmail, candidateName: 'Bob Smith' }),
        makeApp({ email: sharedEmail, candidateName: 'Bob S.' }),
        makeApp({ email: sharedEmail, candidateName: 'Robert Smith' }),
        ...Array.from({ length: 7 }, () => makeApp()),
      ];

      const result = await processor.processBatch(JOB_ID, apps);

      expect(result.duplicatesBlocked).toBe(2);
      expect(result.slotsUsed).toBe(5);
      expect(result.shortlisted).toHaveLength(5);

      const duplicatesInShortlist = result.shortlisted.filter((a) => a.isDuplicate);
      expect(duplicatesInShortlist).toHaveLength(0);
    });

    it('with 3 vacancies and 5 shortlist slots, selects top 5 unique candidates', async () => {
      const processor = createResumeProcessor({ maxShortlistSlots: 5 });

      const apps = Array.from({ length: 20 }, () => makeApp());
      const result = await processor.processBatch(JOB_ID, apps);

      expect(result.slotsMax).toBe(5);
      expect(result.shortlisted).toHaveLength(5);
      expect(result.duplicatesBlocked).toBe(0);

      for (let i = 0; i < result.shortlisted.length - 1; i++) {
        expect(result.shortlisted[i]!.score).toBeGreaterThanOrEqual(result.shortlisted[i + 1]!.score);
      }
    });

    it('handles 0 valid applications gracefully', async () => {
      const processor = createResumeProcessor();
      const result = await processor.processBatch(JOB_ID, []);

      expect(result.shortlisted).toHaveLength(0);
      expect(result.slotsUsed).toBe(0);
    });
  });

  describe('Phone number normalization', () => {
    it('treats "+91 98765-43210" and "9876543210" as the same phone', async () => {
      const processor = createResumeProcessor();

      const app1 = makeApp({ phone: '+91 98765-43210', email: 'a@a.com' });
      const app2 = makeApp({ phone: '9876543210', email: 'b@b.com' });

      const r1 = await processor.processOne(app1);
      const r2 = await processor.processOne(app2);

      expect(r1.isDuplicate).toBe(false);
      expect(r2.isDuplicate).toBe(true);
    });
  });
});
