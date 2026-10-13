import type { FloorPoint } from '../scene/types';
import { REBOOT_HAND, RESUMABLE_REBOOT_INTENTS, type RebootCommand, type RebootEvent, type RebootIntent, type RebootStage, type RebootView, type TouchRegion } from './contracts';
import { personalityPlan, personalitySelection, personalityPoseStyle, type PersonalityId } from './personality';
import { makeHandActingPlan, sampleHandContact, sampleHandRelease, type HandActingPlan, type HandActingPose } from './handActing';
import { BABY_AUTONOMOUS, babyPlan, babyTarget, currentBabyBeat, type BabyPlan, type BabyBeat } from './babyLife';
import { selectLivingScene, type LivingOutcome } from './autonomy';
import { CELEBRATION_TUNING } from './celebration';

export type RebootWorld = { enabled: boolean; awake: boolean; moving: boolean; touching: boolean; position: FloorPoint; facing?: number; view: RebootView; touchRegion?: TouchRegion; interruptedForTouch?: RebootIntent };
export type RebootPose = { kind: RebootIntent; phase: string; progress: number; stage: RebootStage; held: boolean; releaseFrom?: number; gazeTarget?: FloorPoint; dockTarget?: FloorPoint;
  attentionSide?: number;
  personalityId?: PersonalityId;
  handActing?: HandActingPose;
  baby?: Readonly<{ beat: BabyBeat; progress: number; touchStyle?: string; rememberedHandId?: string }> };
type Intent = { command: RebootCommand; phase: RebootEvent['phase']; elapsed: number; automatic: boolean; releaseFrom?: number; baby?: BabyPlan; beatIndex?: number; touchRegion?: TouchRegion;
  handPlan?: HandActingPlan; releaseHand?: HandActingPose; handBeat?: string };
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
  private recentTouchStyles: string[] = [];
  private touchRegion: TouchRegion = 'unknown';
  private interruptedForTouch?: RebootIntent;
  private randomState?: number;
  private selectionReason?: string;
  private initializedPersonality?: string;
  private recentScenes: string[] = [];
  private activeScenes = 0;
  private lastOutcome?: LivingOutcome;
  private draw() {
    if(this.randomState===undefined)return this.random();
    let x=this.randomState; x^=x<<13; x^=x>>>17; x^=x<<5; this.randomState=x>>>0;return this.randomState/4294967296;
  }
  pose?: RebootPose;
  constructor(private readonly ports: { navigate: (p: FloorPoint) => boolean; stop: () => void; event: (e: RebootEvent) => void }, private random = Math.random, private now = Date.now) {}
  get current() { return this.intent ? { kind: this.intent.command.kind, phase: this.intent.phase, token: this.intent.command.token } : null; }
  private emit(phase: RebootEvent['phase']) {
    if (!this.intent || !this.view) return;
    const baby = this.intent.baby ? currentBabyBeat(this.intent.baby, this.intent.elapsed) : undefined;
    const handActing = this.intent.handPlan && phase === 'contact' ? sampleHandContact(this.intent.handPlan, this.intent.elapsed) : undefined;
    this.ports.event({ ...this.intent.command, ...(this.view.personality ? { personalityId: this.view.personality.foundation.profileId, selectionReason: this.selectionReason, randomState: this.randomState } : {}), phase, automatic: this.intent.automatic, stage: this.view.stage,
      ...(this.intent.baby ? { babyMode: true } : {}),
      ...(this.intent.command.kind === 'hand' ? { touchRegion: this.intent.touchRegion } : {}),
      ...(handActing ? { handActing, handContext: this.intent.handPlan!.context, handStyle: this.intent.handPlan!.style } : {}),
      ...(baby && phase === 'contact' ? { babyBeat: handActing?.beat ?? baby.beat.id, expression: handActing?.expression ?? baby.beat.expression,
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
    const baby = command.scene?.plan ?? (command.kind === 'life_context' ? command.contextCue?.plan : this.view?.babyCharm && this.view.stage === 'baby' ? (this.view.personality ? personalityPlan(this.view.personality.foundation.profileId, command.kind, this.touchRegion, this.recentTouchStyles, interrupted, this.view.familiarHandId) : undefined) ?? babyPlan(command.kind, this.touchRegion,
      repeated, interrupted, this.view.familiarHandId, this.touchBurst, this.recentTouchStyles) : undefined);
    if (baby?.touchStyle) { this.recentTouchStyles.push(baby.touchStyle); this.recentTouchStyles = this.recentTouchStyles.slice(-3); }
    if (command.kind === 'hand') { this.lastTouchAt = this.now(); this.lastTouchRegion = this.touchRegion; }
    const handPlan = command.kind === 'hand' && baby && this.view?.personality ? makeHandActingPlan(this.view.personality.foundation.profileId,
      baby.touchStyle ?? 'lean', interrupted, !!baby.rememberedHandId, this.recentTouchStyles) : undefined;
    this.cancel(); this.intent = { command, phase: 'look', elapsed: 0, automatic, baby, handPlan, beatIndex: -1, touchRegion: this.touchRegion }; this.emit('start'); this.emit('look');
  }
  private contactDuration(kind: RebootIntent) {
    return kind === 'hat_first' ? 3.8 : kind === 'hat_again' ? 1.7
      : kind === 'hat_busy' ? 1.1 : kind === 'rest' ? 6.5 : 3.2;
  }
  private transition(phase: RebootEvent['phase']) {
    if (!this.intent) return;
    if (phase === 'recover') this.intent.releaseFrom = Math.min(1, this.intent.elapsed / (this.intent.baby ? this.intent.baby.beats.reduce((sum, b) => sum + b.seconds, 0) : this.contactDuration(this.intent.command.kind)));
    if (phase === 'recover' && this.intent.handPlan) this.intent.releaseHand = sampleHandContact(this.intent.handPlan, this.intent.elapsed);
    this.intent.phase = phase; this.intent.elapsed = 0; this.emit(phase);
    if (phase === 'contact') this.intent.beatIndex = 0;
  }
  update(dt: number, w: RebootWorld) {
    this.view = w.view;
    if(w.view.personality && this.initializedPersonality !== w.view.personality.foundation.petId){this.initializedPersonality=w.view.personality.foundation.petId;this.randomState=w.view.personality.randomState;}
    this.touchRegion = w.touching ? w.touchRegion ?? 'unknown' : 'unknown'; this.interruptedForTouch = w.touching ? w.interruptedForTouch : undefined;
    if (!w.awake) { if (this.intent) this.cancel(); this.hand = false; this.touching = false; return; }
    if (!w.enabled) {
      // Opening a panel cancels a hand exchange; closing it must not turn a
      // canceled gesture into completed experience or resume the old contact.
      if (this.intent?.handPlan || this.intent?.command.kind === 'life_context' || w.view.livingCharm && this.intent?.command.scene) { this.cancel(); this.hand = false; this.touching = false; }
      return;
    }
    if (this.intent?.command.kind === 'life_context' && this.intent.command.contextGeneration !== w.view.contextGeneration) this.cancel();
    if (w.view.command && w.view.command.token !== this.lastCommand) {
      this.lastCommand = w.view.command.token;
      if (w.view.command.kind !== 'life_context' || w.view.command.contextGeneration === w.view.contextGeneration) this.begin(w.view.command, w.view.command.kind === 'life_context');
    }
    if (w.view.handOffered !== this.hand) {
      this.hand = w.view.handOffered;
      if (this.hand) { const prior = this.intent; this.begin({ token: `${this.session}:hand:${++this.token}`, kind: 'hand', sourceRevision: w.view.revision, target: REBOOT_HAND }, false); this.touched = w.view.personality ? prior : undefined; }
      else if (this.intent?.command.kind === 'hand') {
        if (this.intent.phase === 'contact') this.transition('recover'); else this.cancel();
      }
    }
    if (w.touching !== this.touching) {
      this.touching = w.touching;
      if (w.touching) {
        const prior = this.intent; this.begin({ token: `${this.session}:touch:${++this.token}`, kind: 'hand', sourceRevision: w.view.revision }, false); this.touched = prior; this.transition('contact');
      } else if (this.intent?.command.kind === 'hand' && !w.view.personality) this.transition('recover');
    }
    if (!this.intent) {
      if (w.moving) return;
      this.idle -= dt;
      if (this.idle > 0) return;
      const scene = w.view.livingCharm && w.view.stage === 'baby' && w.view.personality ? selectLivingScene({ profile: w.view.personality.foundation.profileId,
        axes: w.view.personality.axes, position: w.position, cushion: w.view.cushion, petId: w.view.personality.foundation.petId,
        facts: w.view.recentExperience ?? [], recent: this.recentScenes.length ? this.recentScenes : (w.view.recentExperience ?? []).flatMap(f => f.sceneId ? [f.sceneId] : []).slice(-12),
        activeScenes: this.activeScenes, lastOutcome: this.lastOutcome, random: this.draw(), atMs: this.now() }) : undefined;
      const choices: readonly RebootIntent[] = w.view.babyCharm && w.view.stage === 'baby' ? BABY_AUTONOMOUS
        : ['explore', 'stretch', 'company', 'rest', ...(w.view.stage === 'baby' ? [] : ['dash' as const])];
      const fresh = choices.filter(x => !this.recent.slice(-2).includes(x));
      const choice = !scene && w.view.personality ? personalitySelection(w.view.personality.foundation.profileId, this.recent, this.draw(), w.view.cushion, w.view.personality.axes) : undefined;
      this.selectionReason = choice?.reason;
      const kind = scene?.kind ?? choice?.kind ?? fresh[Math.floor(this.draw() * fresh.length)] ?? 'explore';
      const target = scene?.target ?? choice?.target ?? (w.view.babyCharm && w.view.stage === 'baby' ? babyTarget(kind, w.view.cushion, () => this.draw())
        : kind === 'rest' ? w.view.cushion : kind === 'company' ? { x: .6, z: 3.1 }
        : { x: this.draw() * 3.0 - 1.5, z: this.draw() * 3 - .5 });
      this.selectionReason = scene?.reason ?? this.selectionReason;
      this.begin({ token: `${this.session}:auto:${++this.token}`, kind, target, sourceRevision: w.view.revision, ...(scene ? { scene } : {}),
        ...(kind === 'rest' ? { itemRevision: w.view.cushion.revision } : {}) }, true);
    }
    const i = this.intent!;
    i.elapsed += Math.min(dt, .1);
    if (i.command.kind.startsWith('hat') && !w.view.hatWorn) { this.cancel(); return; }
    if (['rest', 'cushion_changed'].includes(i.command.kind) && i.command.itemRevision !== undefined &&
        i.command.itemRevision !== w.view.cushion.revision) { this.cancel(); return; }
    const recoveryDuration = i.handPlan?.recoverySeconds ?? (w.view.stage === 'baby' ? 1.4 : 2.2);
    const contactDuration = i.baby ? i.baby.beats.reduce((sum, b) => sum + b.seconds, 0) : this.contactDuration(i.command.kind);
    const currentBeat = i.baby ? currentBabyBeat(i.baby, i.elapsed) : undefined;
    const handActing = i.handPlan && i.phase === 'contact' ? sampleHandContact(i.handPlan, i.elapsed)
      : i.handPlan && i.releaseHand && i.phase === 'recover' ? sampleHandRelease(i.handPlan, i.releaseHand, i.elapsed) : undefined;
    if (currentBeat && i.phase === 'contact' && (handActing ? i.handBeat !== handActing.beat : i.beatIndex !== currentBeat.index)) {
      i.beatIndex = currentBeat.index; i.handBeat = handActing?.beat; this.emit('contact');
    }
    this.pose = { ...(w.view.personality ? { personalityId: w.view.personality.foundation.profileId } : {}), kind: i.command.kind, phase: i.phase,
      progress: Math.min(1, i.elapsed / (i.phase === 'recover' ? recoveryDuration : contactDuration)),
      releaseFrom: i.releaseFrom, stage: w.view.stage, held: this.touching || this.hand,
      ...(handActing ? { handActing } : {}),
      ...(currentBeat ? { baby: { beat: i.phase === 'approach' ? { id: 'travel', seconds: 1, expression: 'excited' as const }
          : i.phase === 'look' ? { id: i.command.kind === 'cushion_changed' ? 'old_place' : 'notice', seconds: 1, expression: i.command.contextCue?.intent === 'goal' ? 'excited' as const : 'curious' as const }
            : i.phase === 'recover' ? { id: 'look_back', seconds: recoveryDuration, expression: 'content' as const } : currentBeat.beat,
        progress: i.phase === 'contact' ? currentBeat.progress : Math.min(1, i.elapsed / recoveryDuration), touchStyle: i.baby?.touchStyle,
        rememberedHandId: i.baby?.rememberedHandId } } : {}),
      ...(i.command.target && (i.phase === 'look' || i.command.kind === 'hand') ? { gazeTarget: i.command.target } : {}),
      ...(i.command.kind === 'cushion_changed' && i.phase === 'look' ? { gazeTarget: i.command.observation === 'witnessed' ? w.view.cushion : i.command.target ?? w.view.cushion } : {}),
      ...(['rest', 'cushion_changed'].includes(i.command.kind) ? { dockTarget: w.view.cushion } : {}) };
    if (i.baby && ['contact', 'recover'].includes(i.phase) && i.command.kind !== 'hand') {
      // Attend to the actual object first; checking the user is a finishing
      // beat, not the same compulsory camera-facing pose throughout a scene.
      this.pose.gazeTarget = ['look_back', 'paw_offer', 'lean', 'side_nuzzle'].includes(currentBeat?.beat.id ?? '') || i.phase === 'recover'
        ? { x: 0, z: 4.3 } : i.command.kind === 'cushion_changed' ? w.view.cushion : i.command.target;
    }
    if (i.command.kind === 'life_context') this.pose.gazeTarget = { x: 0, z: 4.3 };
    if (i.command.contextCue?.intent === 'goal' && this.pose.personalityId === 'poised' && i.phase === 'recover' && i.elapsed > .35)
      this.pose.gazeTarget = i.command.resumeScene?.focusPoint ?? i.command.resumeTarget ?? this.pose.gazeTarget;
    if (i.command.scene && ['look', 'contact'].includes(i.phase)) {
      const userBeat = ['look_back', 'lean', 'paw_offer', 'side_nuzzle', 'settle_floor'].includes(currentBeat?.beat.id ?? '');
      this.pose.gazeTarget = i.phase === 'contact' && userBeat ? { x: 0, z: 4.3 } : i.command.scene.focusPoint;
    }
    if (this.pose.gazeTarget) this.pose.attentionSide = Math.sin(Math.atan2(this.pose.gazeTarget.x - w.position.x, this.pose.gazeTarget.z - w.position.z) - (w.facing ?? 0));
    if (i.handPlan?.profile === 'poised' && i.phase === 'recover' && i.elapsed > .25 && this.touched?.command.target)
      this.pose.gazeTarget = this.touched.command.target;
    // Remembered coordinates are a glance only; route/dock always use current truth.
    const lookDuration = i.command.kind === 'cushion_changed' ? 1.1 : w.view.personality ? personalityPoseStyle(w.view.personality.foundation.profileId, 'curious').lookSeconds : w.view.stage === 'baby' ? .65 : .30;
    if (i.phase === 'look' && i.elapsed >= lookDuration) {
      const handOffset = w.view.babyCharm ? .64 * .53 * (w.view.sizeCandidate ?? 1.25) * (w.view.readabilityCandidate ? CELEBRATION_TUNING.readabilityMultiplier : 1) + .205 : .48;
      const target = i.command.kind === 'hand' ? { x: REBOOT_HAND.x, z: REBOOT_HAND.z - handOffset }
        : i.command.kind === 'cushion_changed' ? w.view.cushion
          : i.command.kind === 'hat_first' ? { x: Math.min(1.6, w.position.x + .38), z: Math.max(-.3, w.position.z - .25) } : i.command.target;
      const needsApproach = !!target && (!(i.command.scene || i.command.contextCue?.intent === 'goal') || Math.hypot(target.x - w.position.x, target.z - w.position.z) > .06);
      if (needsApproach && !this.ports.navigate(target!)) { this.cancel(); return; }
      this.transition(needsApproach ? 'approach' : 'contact');
    } else if (i.phase === 'approach') {
      if (!w.moving) this.transition('contact');
      else if (i.elapsed > 12) this.cancel();
    } else if (i.phase === 'contact') {
      if (i.command.kind === 'hand' && (this.touching || this.hand)) return;
      if ((i.command.kind === 'life_context' || i.command.scene) && w.view.contextSpeechReading) return;
      const duration = contactDuration;
      if (i.elapsed >= duration) this.transition('recover');
    } else if (i.phase === 'recover' && i.elapsed >= recoveryDuration) {
      const done = i.command, resume = done.resume ?? (done.contextCue?.intent === 'goal' ? done.resumeScene?.kind : undefined) ?? (done.kind === 'hand' ? this.touched?.command.kind : undefined);
      const resumeTarget = done.resumeTarget ?? this.touched?.command.target ?? { x: .8, z: 1 };
      this.emit('complete'); this.recent.push(done.kind); this.recent = this.recent.slice(-4);
      if (done.scene) { this.recentScenes = [...this.recentScenes, done.scene.id].slice(-12); this.lastOutcome = done.scene.outcome;
        this.activeScenes = ['cushion', 'quiet_floor', 'user'].includes(done.scene.focus) ? 0 : this.activeScenes + 1; }
      else if (done.kind === 'hand') this.lastOutcome = 'shared';
      this.intent = undefined; this.pose = undefined; this.touched = undefined; this.idle = done.scene?.pauseSeconds ?? (w.view.personality ? personalityPoseStyle(w.view.personality.foundation.profileId, 'content').pauseSeconds : 3.5) + this.draw() * 3;
      const resumedScene = done.resumeScene;
      const stillValid = !resumedScene || resumedScene.focus !== 'cushion' || Math.hypot(resumedScene.target.x - w.view.cushion.x, resumedScene.target.z - w.view.cushion.z) < .01;
      if (resume && stillValid && ((RESUMABLE_REBOOT_INTENTS as readonly string[]).includes(resume) || done.contextCue?.intent === 'goal' && resumedScene?.kind === resume)) this.begin({ token: `${this.session}:resume:${++this.token}`,
        kind: resume as RebootIntent, sourceRevision: w.view.revision, target: resumeTarget,
        ...(resumedScene ? { scene: resumedScene } : {}), ...(resume === 'rest' ? { itemRevision: w.view.cushion.revision } : {}) }, true);
    }
  }
}
