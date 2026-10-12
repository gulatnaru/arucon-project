/** Wall clock for speech only. It never advances simulation or awards anything. */
export class BubbleReadingClock {
  private deadline: number;
  private remaining: number;
  private holds = new Set<string>();
  constructor(durationMs: number, nowMs: number) { this.remaining = durationMs; this.deadline = nowMs + durationMs; }
  get paused() { return this.holds.size > 0; }
  remainingMs(nowMs: number) { return this.paused ? this.remaining : Math.max(0, this.deadline - nowMs); }
  hold(reason: string, nowMs: number) { if (!this.paused) this.remaining = this.remainingMs(nowMs); this.holds.add(reason); }
  release(reason: string, nowMs: number) { if (!this.holds.has(reason)) return; this.holds.delete(reason); if (!this.paused) this.deadline = nowMs + this.remaining; }
}
export function speechReadingMs(text: string) { return Math.min(18_000, Math.max(3500, 2400 + Array.from(text).length * 180)); }
/** Uses native measured glyph/line widths, not a Korean character estimate. */
export function measuredSpeechWidth(lines: readonly { width: number }[], maxWidth: number) {
  // Keep the native wrapping constraint for multiline text: shrinking again to
  // a trimmed line width can strand the final Korean syllable on a new line.
  if (lines.length > 1) return maxWidth;
  // Native glyph width excludes the bubble's horizontal padding and borders.
  return Math.min(maxWidth, Math.max(44, Math.ceil(Math.max(0, ...lines.map(x => x.width))) + 26));
}
