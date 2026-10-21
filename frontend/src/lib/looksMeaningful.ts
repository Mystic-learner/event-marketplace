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

const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

// Single word of 4+ letters where every pair is the same letter or
// neighbouring keys on one row, e.g. "asds", "jkjk", "qwer".
function isKeyboardSmash(t: string): boolean {
  if (/\s/.test(t)) return false;
  const w = t.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length < 4) return false;
  for (let i = 0; i < w.length - 1; i++) {
    const a = w.charAt(i);
    const b = w.charAt(i + 1);
    if (a === b) continue;
    const near = ROWS.some((r) => {
      const x = r.indexOf(a);
      const y = r.indexOf(b);
      return x >= 0 && y >= 0 && Math.abs(x - y) === 1;
    });
    if (!near) return false;
  }
  return true;
}
export function looksMeaningful(name: string): boolean {
  const t = name.trim();
  if (t.length < 3 || t.length > 100) return false;
  if (!HAS_LETTER.test(t)) return false;
  if (/^(.)\1+$/.test(t.replace(/\s+/g, ""))) return false;
  if (KEYBOARD_RUNS.test(t)) return false;
  if (CONSONANT_RUN.test(t)) return false;
  if (isKeyboardSmash(t)) return false;
  return true;
}