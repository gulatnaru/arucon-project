import { countGraphemes } from 'unicode-segmenter/grapheme';

const TOKEN = '{petName}';
const templateToken = /\{[^{}]+\}/gu;
const forbiddenDisplayName = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u;

export function validateReactionTextTemplate(value: string): readonly string[] {
  const errors: string[] = [];
  for (const token of value.match(templateToken) ?? []) {
    if (token !== TOKEN) errors.push(`unsupported text token ${token}`);
  }
  return errors;
}

export function normalizeReactionDisplayName(value: string | undefined): string {
  const normalized = (value ?? '아루콘').normalize('NFC').trim();
  if (!normalized || forbiddenDisplayName.test(normalized)) throw new Error('Reaction display name contains invalid characters');
  const graphemes = countGraphemes(normalized);
  // Approved names have at most 12 graphemes plus the fixed 콘 suffix.
  if (graphemes < 1 || graphemes > 13) throw new Error('Reaction display name must have 1–13 graphemes');
  return normalized;
}

export function renderReactionText(template: string, displayName: string): string {
  const errors = validateReactionTextTemplate(template);
  if (errors.length) throw new Error(errors.join('; '));
  return template.split(TOKEN).join(displayName);
}
