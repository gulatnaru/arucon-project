import type { FloorPoint } from '../scene/types';
import { REBOOT_HAND, RESUMABLE_REBOOT_INTENTS, type RebootCommand, type RebootEvent, type RebootIntent, type RebootStage, type RebootView, type TouchRegion } from './contracts';
import { BABY_AUTONOMOUS, babyPlan, babyTarget, currentBabyBeat, type BabyPlan, type BabyBeat } from './babyLife';

export type RebootWorld = { enabled: boolean; awake: boolean; moving: boolean; touching: boolean; position: FloorPoint; view: RebootView; touchRegion?: TouchRegion; interruptedForTouch?: RebootIntent };
export type RebootPose = { kind: RebootIntent; phase: string; progress: number; stage: RebootStage; held: boolean; releaseFrom?: number; gazeTarget?: FloorPoint; dockTarget?: FloorPoint;
  baby?: Readonly<{ beat: BabyBeat; progress: number; touchStyle?: string; rememberedHandId?: string }> };
type Intent = { command: RebootCommand; phase: RebootEvent['phase']; elapsed: number; automatic: boolean; releaseFrom?: number; baby?: BabyPlan; beatIndex?: number; touchRegion?: TouchRegion };
let sessionSequence = 0;
/** One persistent actor. Frame updates contain no lookup, promise, React or SQL. */
export class RebootDirector {
  private intent?: Intent;
  private view?: RebootView;
  private token = 0;
  private readonly session = `${Date.now()}:${++sessionSequence}`;
  private idle = 2;
  private recent: RebootIntent[] = [];
  private hand = false;
  private touching = false;
  private touched?: Intent;
  private lastCommand?: string;
  private lastTouchAt = -Infinity;
  private lastTouchRegion: TouchRegion = 'unknown';
  private touchBurst = 0;
  private touchRegion: TouchRegion = 'unknown';
  private interruptedForTouch?: RebootIntent;
  pose?: RebootPose;
  constructor(private readonly ports: { navigate: (p: FloorPoint) => boolean; stop: () => void; event: (e: RebootEvent) => void }, private random = Math.random, private now = Date.now) {}
  get current() { return this.intent ? { kind: this.intent.command.kind, phase: this.intent.phase, token: this.intent.command.token } : null; }
  private emit(phase: RebootEvent['phase']) {
    if (!this.intent || !this.view) return;
    const baby = this.intent.baby ? currentBabyBeat(this.intent.baby, this.intent.elapsed) : undefined;
    this.ports.event({ ...this.intent.command, phase, automatic: this.intent.automatic, stage: this.view.stage,
      ...(this.intent.baby ? { babyMode: true } : {}),
      ...(this.intent.command.kind === 'hand' ? { touchRegion: this.intent.touchRegion } : {}),
      ...(baby && phase === 'contact' ? { babyBeat: baby.beat.id, expression: baby.beat.expression,
        touchRegion: this.intent.touchRegion, memoryIds: this.intent.baby?.rememberedHandId ? [this.intent.baby.rememberedHandId] : [] } : {}),
      ...(['rest', 'cushion_changed'].includes(this.intent.command.kind) ? { currentTarget: this.view.cushion } : {}),
      ...(this.intent.command.kind === 'cushion_changed' && this.intent.command.target ? { rememberedPosition: this.intent.command.target } : {}) });
  }
  cancel() { if (this.intent) this.emit('cancel'); this.intent = undefined; this.touched = undefined; this.pose = undefined; this.ports.stop(); this.idle = 1.8; }
  private begin(command: RebootCommand, automatic: boolean) {
    const interrupted = this.intent?.command.kind ?? (command.kind === 'hand' ? this.interruptedForTouch : undefined);
    const sinceTouch = this.now() - this.lastTouchAt;
    const repeated = command.kind === 'hand' && this.lastTouchRegion === this.touchRegion && sinceTouch >= 0 && sinceTouch < 8_000;
    if (command.kind === 'hand') this.touchBurst = repeated ? this.touchBurst + 1 : 0;
    const baby = this.view?.babyCharm && this.view.stage === 'baby' ? babyPlan(command.kind, this.touchRegion,
      repeated, interrupted, this.view.familiarHandId, this.touchBurst) : undefined;
    if (command.kind === 'hand') { this.lastTouchAt = this.now(); this.lastTouchRegion = this.touchRegion; }
    this.cancel(); this.intent = { command, phase: 'look', elapsed: 0, automatic, baby, beatIndex: -1, touchRegion: this.touchRegion }; this.emit('start'); this.emit('look');
  }
  private contactDuration(kind: RebootIntent) {
    return kind === 'hat_first' ? 3.8 : kind === 'hat_again' ? 1.7
      : kind === 'hat_busy' ? 1.1 : kind === 'rest' ? 6.5 : 3.2;
  }
  private transition(phase: RebootEvent['phase']) {
    if (!this.intent) return;
    if (phase === 'recover') this.intent.releaseFrom = Math.min(1, this.intent.elapsed / (this.intent.baby ? this.intent.baby.beats.reduce((sum, b) => sum + b.seconds, 0) : this.contactDuration(this.intent.command.kind)));
    this.intent.phase = phase; this.intent.elapsed = 0; this.emit(phase);
    if (phase === 'contact') this.intent.beatIndex = 0;
  }
  update(dt: number, w: RebootWorld) {
    this.view = w.view; this.touchRegion = w.touching ? w.touchRegion ?? 'unknown' : 'unknown'; this.interruptedForTouch = w.touching ? w.interruptedForTouch : undefined;
    if (!w.awake) { if (this.intent) this.cancel(); this.hand = false; this.touching = false; return; }
    if (!w.enabled) return;
    if (w.view.command && w.view.command.token !== this.lastCommand) {
      this.lastCommand = w.view.command.token; this.begin(w.view.command, false);
    }
    if (w.view.handOffered !== this.hand) {
      this.hand = w.view.handOffered;
      if (this.hand) this.begin({ token: `${this.session}:hand:${++this.token}`, kind: 'hand', sourceRevision: w.view.revision, target: REBOOT_HAND }, false);
      else if (this.intent?.command.kind === 'hand') {
        if (this.intent.phase === 'contact') this.transition('recover'); else this.cancel();
      }
    }
    if (w.touching !== this.touching) {
      this.touching = w.touching;
      if (w.touching) {
        const prior = this.intent; this.begin({ token: `${this.session}:touch:${++this.token}`, kind: 'hand', sourceRevision: w.view.revision }, false); this.touched = prior; this.transition('contact');
      } else if (this.intent?.command.kind === 'hand') this.transition('recover');
    }
    if (!this.intent) {
      if (w.moving) return;
      this.idle -= dt;
      if (this.idle > 0) return;
      const choices: readonly RebootIntent[] = w.view.babyCharm && w.view.stage === 'baby' ? BABY_AUTONOMOUS
        : ['explore', 'stretch', 'company', 'rest', ...(w.view.stage === 'baby' ? [] : ['dash' as const])];
      const fresh = choices.filter(x => !this.recent.slice(-2).includes(x));
      const kind = fresh[Math.floor(this.random() * fresh.length)] ?? 'explore';
      const target = w.view.babyCharm && w.view.stage === 'baby' ? babyTarget(kind, w.view.cushion, this.random)
        : kind === 'rest' ? w.view.cushion : kind === 'company' ? { x: .6, z: 3.1 }
        : { x: this.random() * 3.0 - 1.5, z: this.random() * 3 - .5 };
      this.begin({ token: `${this.session}:auto:${++this.token}`, kind, target, sourceRevision: w.view.revision,
        ...(kind === 'rest' ? { itemRevision: w.view.cushion.revision } : {}) }, true);
    }
    const i = this.intent!;
    i.elapsed += Math.min(dt, .1);
    if (i.command.kind.startsWith('hat') && !w.view.hatWorn) { this.cancel(); return; }
    if (['rest', 'cushion_changed'].includes(i.command.kind) && i.command.itemRevision !== undefined &&
        i.command.itemRevision !== w.view.cushion.revision) { this.cancel(); return; }
    const recoveryDuration = w.view.stage === 'baby' ? 1.4 : 2.2;
    const contactDuration = i.baby ? i.baby.beats.reduce((sum, b) => sum + b.seconds, 0) : this.contactDuration(i.command.kind);
    const currentBeat = i.baby ? currentBabyBeat(i.baby, i.elapsed) : undefined;
    if (currentBeat && i.phase === 'contact' && i.beatIndex !== currentBeat.index) { i.beatIndex = currentBeat.index; this.emit('contact'); }
    this.pose = { kind: i.command.kind, phase: i.phase,
      progress: Math.min(1, i.elapsed / (i.phase === 'recover' ? recoveryDuration : contactDuration)),
      releaseFrom: i.releaseFrom, stage: w.view.stage, held: this.touching || this.hand,
      ...(currentBeat ? { baby: { beat: i.phase === 'approach' ? { id: 'travel', seconds: 1, expression: 'excited' as const }
          : i.phase === 'look' ? { id: i.command.kind === 'cushion_changed' ? 'old_place' : 'notice', seconds: 1, expression: 'curious' as const }
            : i.phase === 'recover' ? { id: 'look_back', seconds: recoveryDuration, expression: 'content' as const } : currentBeat.beat,
        progress: i.phase === 'contact' ? currentBeat.progress : Math.min(1, i.elapsed / recoveryDuration), touchStyle: i.baby?.touchStyle,
        rememberedHandId: i.baby?.rememberedHandId } } : {}),
      ...(i.command.kind === 'hand' && i.command.target ? { gazeTarget: i.command.target } : {}),
      ...(i.command.kind === 'cushion_changed' && i.phase === 'look' ? { gazeTarget: i.command.target ?? w.view.cushion } : {}),
      ...(['rest', 'cushion_changed'].includes(i.command.kind) ? { dockTarget: w.view.cushion } : {}) };
    if (i.baby && ['contact', 'recover'].includes(i.phase) && i.command.kind !== 'hand') this.pose.gazeTarget = { x: 0, z: 4.3 };
    // Remembered coordinates are a glance only; route/dock always use current truth.
    const lookDuration = i.command.kind === 'cushion_changed' ? 1.1 : w.view.stage === 'baby' ? .65 : .30;
    if (i.phase === 'look' && i.elapsed >= lookDuration) {
      const handOffset = w.view.babyCharm ? .64 * .53 * (w.view.sizeCandidate ?? 1.25) + .205 : .48;
      const target = i.command.kind === 'hand' ? { x: REBOOT_HAND.x, z: REBOOT_HAND.z - handOffset }
        : i.command.kind === 'cushion_changed' ? w.view.cushion
          : i.command.kind === 'hat_first' ? { x: Math.min(1.6, w.position.x + .38), z: Math.max(-.3, w.position.z - .25) } : i.command.target;
      if (target && !this.ports.navigate(target)) { this.cancel(); return; }
      this.transition(target ? 'approach' : 'contact');
    } else if (i.phase === 'approach') {
      if (!w.moving) this.transition('contact');
      else if (i.elapsed > 12) this.cancel();
    } else if (i.phase === 'contact') {
      if (i.command.kind === 'hand' && (this.touching || this.hand)) return;
      const duration = contactDuration;
      if (i.elapsed >= duration) this.transition('recover');
    } else if (i.phase === 'recover' && i.elapsed >= recoveryDuration) {
      const done = i.command, resume = done.resume ?? (done.kind === 'hand' ? this.touched?.command.kind : undefined);
      const resumeTarget = done.resumeTarget ?? this.touched?.command.target ?? { x: .8, z: 1 };
      this.emit('complete'); this.recent.push(done.kind); this.recent = this.recent.slice(-4);
      this.intent = undefined; this.pose = undefined; this.touched = undefined; this.idle = 3.5 + this.random() * 3;
      if (resume && (RESUMABLE_REBOOT_INTENTS as readonly string[]).includes(resume)) this.begin({ token: `${this.session}:resume:${++this.token}`,
        kind: resume as RebootIntent, sourceRevision: w.view.revision, target: resumeTarget }, true);
    }
  }
}
