/**
 * Basic quality check for event names. A heuristic, not moderation.
 * Keep this file identical in backend and frontend.
 */
const KEYBOARD_RUNS = /(qwert|asdf|zxcv|hjkl|sdfg|dfgh)/i;
// 6+ consonants in a row (y counts as a vowel)
const CONSONANT_RUN = /[bcdfghjklmnpqrstvwxz]{6,}/i;
const HAS_LETTER = /[A-Za-z\u0900-\u097F]/;

export const EVENT_NAME_MESSAGE =
  'Enter a real event name, e.g. "Sharma Wedding Reception"';

export function looksMeaningful(name: string): boolean {
  const t = name.trim();
  if (t.length < 3 || t.length > 100) return false;
  if (!HAS_LETTER.test(t)) return false;
  if (/^(.)\1+$/u.test(t.replace(/\s+/g, ""))) return false;
  if (KEYBOARD_RUNS.test(t)) return false;
  if (CONSONANT_RUN.test(t)) return false;
  return true;
}