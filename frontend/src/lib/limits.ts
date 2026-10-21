export const LIMITS = {
  MAX_GUESTS: 100000,
  MIN_MONEY: 1,          // rupees
  MAX_MONEY: 100000000,  // 10 crore, adjust if you like
  NOTES_MAX: 1000,
  MAX_PAY_RATE: 100000,
  MAX_HEADCOUNT: 1000,
  MAX_YEARS_AHEAD: 3,
};

// "YYYY-MM-DD" for today + N years. Computed per call so a long-running
// server never uses a stale date.
export function maxEventDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + LIMITS.MAX_YEARS_AHEAD);
  return d.toISOString().slice(0, 10);
}

// Letters (Latin, Devanagari, Telugu), spaces and commas only.
// No `u` flag, since the frontend tsconfig targets ES5.
export const LANGUAGES_REGEX = /^[A-Za-z\u0900-\u097F\u0C00-\u0C7F\s,]+$/;