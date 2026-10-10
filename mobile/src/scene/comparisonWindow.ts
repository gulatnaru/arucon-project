export type ComparisonWindowEvent = Readonly<{ token: string; phase: 'warmup' | 'measure' | 'complete' | 'interrupted';
  atMs: number; warmupStartedAtMs: number; measureStartedAtMs?: number; warmupActualMs?: number;
  warmupMs: number; captureMs: number }>;

/** Controls conditions/timing only. It never selects or plays an actor scene. */
export class ComparisonWindow {
  phase: 'waiting' | ComparisonWindowEvent['phase'] = 'waiting';
  private warmMono = 0;
  private warmWall = 0;
  private measureWall?: number;
  constructor(readonly token: string, readonly warmupMs = 30_000, readonly captureMs = 60_000) {}
  step(mono: number, wall: number, ready: boolean, enabled: boolean): ComparisonWindowEvent | undefined {
    if (this.phase === 'waiting' && ready && enabled) { this.warmMono = mono; this.warmWall = wall; this.phase = 'warmup'; return this.event(wall); }
    if (['warmup', 'measure'].includes(this.phase) && !enabled) return this.interrupt(wall);
    if (this.phase === 'warmup' && mono - this.warmMono >= this.warmupMs) {
      this.phase = 'measure'; this.measureWall = wall; return { ...this.event(wall), warmupActualMs: mono - this.warmMono };
    }
  }
  finish(wall: number) { if (this.phase !== 'measure') return undefined; this.phase = 'complete'; return this.event(wall); }
  interrupt(wall: number) { if (!['warmup','measure'].includes(this.phase)) return undefined; this.phase = 'interrupted'; return this.event(wall); }
  get actorEnabled() { return this.phase === 'measure' || this.phase === 'complete'; }
  private event(wall: number): ComparisonWindowEvent { return { token: this.token, phase: this.phase as ComparisonWindowEvent['phase'],
    atMs: wall, warmupStartedAtMs: this.warmWall, measureStartedAtMs: this.measureWall, warmupMs: this.warmupMs, captureMs: this.captureMs }; }
}
