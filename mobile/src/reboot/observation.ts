import type { RebootEvent } from './contracts';
/** Bounded event evidence; never writes a DB or polls a catalog in a frame. */
export class LivingObservation {
  private startMs = 0;
  private endMs = 0;
  private interrupted?: string;
  private events: { atMs: number; token: string; phase: string; scene?: string; focus?: string; expression?: string; reason?: string; channel?: string }[] = [];
  start(atMs: number) { this.startMs = atMs; this.endMs = 0; this.interrupted = undefined; this.events = []; }
  get running() { return this.startMs > 0 && this.endMs === 0; }
  record(e: RebootEvent, atMs: number) { if (!this.running) return;
    this.events.push({ atMs, token: e.token, phase: e.phase, scene: e.scene?.id, focus: e.scene?.focus, expression: e.expression, reason: e.selectionReason });
    if (this.events.length > 2048) this.stop(atMs, 'EVIDENCE_LIMIT');
    if (!e.automatic && e.phase === 'start') this.stop(atMs, 'USER_INTERACTION');
  }
  speech(token: string, atMs: number, channel: string) { if (this.running) this.events.push({ atMs, token, phase: 'speech', channel }); }
  stop(atMs: number, reason?: string) { if (!this.running) return; this.endMs = atMs; this.interrupted = reason; }
  snapshot(atMs: number) {
    const completed = this.events.filter(e => e.phase === 'complete' && e.scene);
    return { startedAtMs: this.startMs, endedAtMs: this.endMs || undefined, elapsedMs: this.startMs ? (this.endMs || atMs) - this.startMs : 0,
      status: !this.startMs ? 'NOT_STARTED' : this.interrupted ? 'INTERRUPTED' : this.endMs ? 'COMPLETE' : 'OBSERVING', reason: this.interrupted,
      completedScenes: completed.length, focuses: [...new Set(completed.map(e => e.focus))], events: this.events,
      scope: 'event trace from normal selection; not visual/GPU proof; no scripted scene order or domain clock change' };
  }
}
