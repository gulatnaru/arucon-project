import type { FloorPoint } from '../scene/types';
import { MEAL_APPROACH } from '../scene/navigation';

/** Presentation seconds only; never passed to the domain simulation clock. */
export const LIFE = Object.freeze({ idleMin: 8, idleSpread: 9, offerMin: 90, offerSpread: 60,
  offerWait: 5, speechGapMs: 20_000, dialogueRest: 25, ballRadius: .22 });
export type LifeScene = 'greeting' | 'look' | 'stretch' | 'inspect' | 'offer' | 'ball' | 'peek'
  | 'gesture' | 'rest' | 'drowsy' | 'meal' | 'toilet' | 'company' | 'mishap' | 'growth' | 'touch' | 'release' | 'hungry' | 'seat' | 'solo';
export type LifeInput = LifeScene | 'cancel' | 'roll' | 'left' | 'right' | 'high_five' | 'tilt';
export type LifeCommand = Readonly<{ token: string; kind: LifeInput; target?: FloorPoint; replay?: boolean }>;
export type LifeEvent = Readonly<{ id: number; scene: LifeScene; phase: 'perform' | 'waiting' | 'complete' | 'cancel'; automatic: boolean; replay: boolean; commandToken?: string }>;
export type LifePose = Readonly<{ scene: LifeScene; progress: number; side: number }> | null;
export type LifeWorld = { awake: boolean; enabled: boolean; touching: boolean; moving: boolean; committed: boolean;
  ball: boolean; cushion: boolean; toilet: boolean; table?: boolean; preference?: LifeScene;
  personality?: 'reserved' | 'expressive'; hungry?: boolean; mealAvailability?: string; growthStage?: number; position: FloorPoint };
export type LifePorts = { navigate(target: FloorPoint): boolean; stop(): void; event(event: LifeEvent): void };
type Intent = { id: number; scene: LifeScene; phase: 'approach' | 'perform' | 'waiting' | 'return'; elapsed: number; automatic: boolean; side: number; duration: number; parking: boolean; chased: boolean; replay: boolean; commandToken?: string };

/** One persistent actor. React redraws neither reseed it nor restart an intent. */
export class LivingPet {
  readonly ball = { x: 1.35, z: 3.1, vx: 0, vz: 0, spin: 0 };
  pose: LifePose = null;
  private intent: Intent | null = null;
  private sequence = 0;
  private idle = 2;
  private offerIn: number;
  private recent: LifeScene[] = [];
  private lastToken?: string;
  private rolled = false;
  private world?: LifeWorld;
  private hungerEpisode: string | null = null;
  private hungerShown = false;
  constructor(private readonly ports: LifePorts, private readonly random = Math.random) {
    this.offerIn = LIFE.offerMin + random() * LIFE.offerSpread;
  }
  get active() { return this.intent?.scene ?? null; }
  get diagnosticIntent() {
    return this.intent ? { id: this.intent.id, scene: this.intent.scene, phase: this.intent.phase,
      commandToken: this.intent.commandToken } : null;
  }
  get waiting() { return this.intent?.phase === 'waiting'; }
  command(command: LifeCommand, world: LifeWorld) {
    this.world = world;
    if (this.lastToken === command.token) return false;
    if (command.kind === 'cancel') { this.lastToken = command.token; this.cancel(); return true; }
    if (!world.enabled || !world.awake || world.committed) return false;
    this.lastToken = command.token;
    if (command.kind === 'roll') return this.roll(command.target ?? { x: -.6 + this.random() * 1.2, z: 4.4 });
    if (command.kind === 'left' || command.kind === 'right' || command.kind === 'high_five' || command.kind === 'tilt') {
      return this.start(command.kind === 'left' || command.kind === 'right' ? 'peek' : 'gesture', false,
        command.kind === 'left' || command.kind === 'tilt' ? -1 : 1);
    }
    return this.start(command.kind, false, undefined, !!command.replay, command.token);
  }
  cancel() {
    if (this.intent) this.emit('cancel');
    this.intent = null; this.pose = null; this.ball.vx = this.ball.vz = 0;
    this.idle = LIFE.idleMin + this.random() * LIFE.idleSpread;
    this.ports.stop();
  }
  private emit(phase: LifeEvent['phase']) {
    if (this.intent) this.ports.event({ id: this.intent.id, scene: this.intent.scene, phase, automatic: this.intent.automatic, replay: this.intent.replay, commandToken: this.intent.commandToken });
  }
  private start(scene: LifeScene, automatic: boolean, side = this.random() > .5 ? 1 : -1, replay = false, commandToken?: string) {
    const world = this.world;
    if (!world || (['ball', 'inspect', 'offer', 'mishap', 'solo'].includes(scene) && !world.ball) || (scene === 'hungry' && !world.hungry) ||
      (scene === 'rest' && !world.cushion) || (scene === 'toilet' && !world.toilet)) return false;
    this.cancel();
    this.intent = { id: ++this.sequence, scene, phase: 'perform', elapsed: 0, automatic, side, duration: 3.8, parking: scene === 'rest' && !automatic && world.ball, chased: false, replay, commandToken };
    this.rolled = false;
    let target: FloorPoint | null = null;
    if (['ball', 'inspect', 'offer', 'mishap', 'solo'].includes(scene)) target = { x: this.ball.x, z: this.ball.z - .72 };
    else if (scene === 'rest') target = this.intent.parking ? { x: this.ball.x, z: this.ball.z - .72 } : { x: -.9, z: .5 };
    else if (scene === 'toilet') target = { x: -1.25, z: -1.6 };
    else if (scene === 'company') target = { x: side * .5, z: world.personality === 'expressive' ? 4.3 : 3.7 };
    else if (['meal', 'hungry'].includes(scene) && world.table) target = { ...MEAL_APPROACH };
    else if (scene === 'seat') target = { x: side * .65, z: side < 0 ? 2.7 : 3.5 };
    if (target && Math.hypot(world.position.x - target.x, world.position.z - target.z) > .1) {
      if (!this.ports.navigate(target)) { this.cancel(); return false; }
      this.intent.phase = 'approach';
    } else this.perform();
    return true;
  }
  private perform() {
    if (!this.intent) return;
    this.intent.phase = 'perform'; this.intent.elapsed = 0;
    this.intent.duration = this.intent.parking ? 2 : this.intent.scene === 'rest' ? 9 : this.intent.scene === 'company' ? 6 : 3.8;
    if (!this.intent.parking) this.emit('perform');
  }
  private roll(target: FloorPoint) {
    if (!this.world?.ball || !this.start('ball', false)) return false;
    const x = Math.max(-.75, Math.min(.8, target.x)), z = Math.max(2.4, Math.min(5.2, target.z));
    this.ball.vx = (x - this.ball.x) * 2.4; this.ball.vz = (z - this.ball.z) * 2.4;
    this.ports.stop();
    if (this.intent) { this.intent.phase = 'return'; this.intent.elapsed = 0; }
    return true;
  }
  update(dt: number, world: LifeWorld) {
    this.world = world;
    const need = world.hungry ? world.mealAvailability ?? 'ready' : null;
    if (need !== this.hungerEpisode) { this.hungerEpisode = need; this.hungerShown = false; }
    if (!world.awake || !world.enabled || world.touching || world.committed) {
      if (this.intent) this.cancel();
      return;
    }
    this.offerIn -= dt;
    const speed = Math.hypot(this.ball.vx, this.ball.vz);
    if (speed > .015) {
      const decay = Math.exp(-2.4 * dt);
      this.ball.x += this.ball.vx * (1 - decay) / 2.4; this.ball.z += this.ball.vz * (1 - decay) / 2.4;
      this.ball.vx *= decay; this.ball.vz *= decay; this.ball.spin += speed * dt / LIFE.ballRadius;
      if (this.ball.x < -1.8 || this.ball.x > 1.8) { this.ball.x = Math.max(-1.8, Math.min(1.8, this.ball.x)); this.ball.vx *= -.5; }
      if (this.ball.z < 1.5 || this.ball.z > 5.5) { this.ball.z = Math.max(1.5, Math.min(5.5, this.ball.z)); this.ball.vz *= -.5; }
    }
    const intent = this.intent;
    if (!intent) {
      if (world.moving) { this.idle = Math.max(this.idle, 4); return; }
      this.idle -= dt;
      if (this.idle > 0) return;
      const candidates: LifeScene[] = ['look', 'stretch', 'company', 'drowsy', 'seat', ...(world.ball ? ['inspect', 'mishap', 'solo'] as const : []), ...(world.cushion ? ['rest'] as const : [])];
      const fresh = candidates.filter(scene => !this.recent.slice(-3).includes(scene));
      const preference = world.preference === 'ball' ? 'inspect' : world.preference;
      if (preference && fresh.includes(preference)) fresh.push(preference);
      if (world.personality === 'expressive' && fresh.includes('company')) fresh.push('company');
      if ((world.growthStage ?? 1) >= 2 && fresh.includes('stretch')) fresh.push('stretch');
      const scene = world.hungry && !this.hungerShown ? 'hungry' : world.ball && this.offerIn <= 0 ? 'offer' : fresh[Math.floor(this.random() * fresh.length)] ?? 'stretch';
      if (scene === 'hungry') this.hungerShown = true;
      this.start(scene, true, this.random() > .5 ? 1 : -1);
      return;
    }
    intent.elapsed += dt;
    if (intent.phase === 'approach') {
      if (!world.moving) this.perform();
      else if (intent.elapsed > 12) this.cancel();
      return;
    }
    if (intent.phase === 'return') {
      this.pose = { scene: 'inspect', progress: .3, side: intent.side };
      if (speed < .18 || intent.elapsed > 3) {
        if (!this.ports.navigate({ x: this.ball.x, z: this.ball.z - .72 })) { this.cancel(); return; }
        intent.phase = 'approach'; intent.elapsed = 0;
      }
      return;
    }
    if (intent.phase === 'waiting') {
      this.pose = { scene: 'inspect', progress: .6, side: intent.side };
      if (intent.elapsed >= LIFE.offerWait) { this.complete(); if (world.ball) this.start('solo', true); }
      return;
    }
    const progress = Math.min(1, intent.elapsed / intent.duration);
    this.pose = { scene: intent.parking ? 'ball' : intent.scene, progress, side: intent.side };
    if ((intent.parking || ['ball', 'offer', 'inspect', 'mishap', 'solo'].includes(intent.scene)) && !this.rolled && progress >= (world.personality === 'reserved' ? .52 : .38)) {
      if (Math.hypot(world.position.x - this.ball.x, world.position.z - this.ball.z) > 1.05) { this.cancel(); return; }
      this.rolled = true;
      this.ball.vx = intent.scene === 'inspect' ? .25 * intent.side : .6 * intent.side;
      this.ball.vz = intent.scene === 'inspect' ? .3 : 1.8 + this.random() * .8;
      if (intent.parking) { this.ball.vx = (-.8 - this.ball.x) * 2.4; this.ball.vz = (1.9 - this.ball.z) * 2.4; }
    }
    if (progress >= 1) {
      if (intent.parking) {
        intent.parking = false; intent.phase = 'approach'; intent.elapsed = 0;
        if (!this.ports.navigate({ x: -.9, z: .5 })) this.cancel();
      } else if (intent.scene === 'solo' && !intent.chased) {
        intent.chased = true; intent.phase = 'return'; intent.elapsed = 0; this.rolled = false;
      } else if (intent.scene === 'offer') {
        intent.phase = 'waiting'; intent.elapsed = 0; this.emit('waiting');
        this.offerIn = LIFE.offerMin + this.random() * LIFE.offerSpread;
      } else this.complete();
    }
  }
  private complete() {
    if (!this.intent) return;
    const released = this.intent.scene === 'touch';
    const replay = this.intent.replay;
    this.emit('complete');
    this.recent.push(this.intent.scene); this.recent = this.recent.slice(-6);
    this.intent = null; this.pose = null;
    this.idle = LIFE.idleMin + this.random() * LIFE.idleSpread;
    if (released) this.start('release', false, undefined, replay);
  }
}
