import { createHash } from 'crypto';

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/[\s\-_.+@]/g, '');
}

function hashAnchor(value: string): string {
  return createHash('sha256').update(normalize(value)).digest('hex').slice(0, 16);
}

function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 1)
    .sort();
}

function contentSignature(text: string): string {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  const prefix = normalized.slice(0, 200);
  return hashAnchor(prefix + normalized.length.toString());
}

export interface ApplicationAnchors {
  emailHash: string;
  phoneHash: string;
  contentSignature: string;
  nameKey: string;
}

export function computeAnchors(app: {
  email: string;
  phone: string;
  resumeText: string;
  candidateName: string;
}): ApplicationAnchors {
  const digits = app.phone.replace(/\D/g, '');
  const normalizedPhone = digits.length >= 10 ? digits.slice(-10) : digits;

  return {
    emailHash: hashAnchor(app.email),
    phoneHash: normalizedPhone.length >= 10 ? hashAnchor(normalizedPhone) : '',
    contentSignature: contentSignature(app.resumeText),
    nameKey: nameTokens(app.candidateName).join(':'),
  };
}
