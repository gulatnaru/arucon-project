import type { BabyPlan, BabyBeat } from './babyLife';
import type { BabyExpression, RebootFact, RebootIntent, RebootStage, TouchRegion } from './contracts';
import type { FloorPoint } from '../scene/types';

export const PERSONALITY_VERSION = 1 as const;
export const PERSONALITY_IDS = ['playful', 'warm', 'poised'] as const;
export type PersonalityId = typeof PERSONALITY_IDS[number];
export type PersonalityAxes = Readonly<{ approach: number; play: number; company: number; novelty: number }>;
export type PersonalityFoundation = Readonly<{ version: 1; petId: string; profileId: PersonalityId; latent: PersonalityAxes; seed: number }>;
export const PERSONALITY_PROFILES: Readonly<Record<PersonalityId, { label: string; petId: string; axes: PersonalityAxes }>> = {
  playful: { label: '장난꾸러기', petId: 'reboot-04:playful', axes: { approach: .8, play: .85, company: .25, novelty: .65 } },
  warm: { label: '다정', petId: 'reboot-04:warm', axes: { approach: .6, play: -.25, company: .85, novelty: -.2 } },
  poised: { label: '도도·호기심', petId: 'reboot-04:poised', axes: { approach: -.35, play: .15, company: -.55, novelty: .9 } },
};
export const hashPersonality = (id: string) => { let n = 2166136261; for (const c of id) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; };
export function newPersonality(id: PersonalityId): PersonalityFoundation {
  const p = PERSONALITY_PROFILES[id]; return { version: 1, petId: p.petId, profileId: id, latent: { ...p.axes }, seed: hashPersonality(p.petId) };
}
export function personalityOwnsPet(id: PersonalityId, petId: string) {
  return PERSONALITY_PROFILES[id].petId === petId ||
    new RegExp(`^reboot-04:compare:[a-z0-9]{8,20}:${id}$`, 'u').test(petId);
}
export function validPersonality(x: unknown, petId: string): x is PersonalityFoundation {
  if (!x || typeof x !== 'object') return false;
  const a = x as PersonalityFoundation;
  return a.version === 1 && PERSONALITY_IDS.includes(a.profileId) && a.petId === petId && personalityOwnsPet(a.profileId, petId)
    && Number.isSafeInteger(a.seed) && a.seed >= 0 && a.seed <= 0xffffffff && !!a.latent &&
    ['approach', 'play', 'company', 'novelty'].every(k => { const n = a.latent[k as keyof PersonalityAxes]; return typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1; });
}
/** Game-only16 combination addresses, never human MBTI codes. No catalog of16 finished types. */
export function personalityAddress(a: PersonalityAxes) {
  return ['approach', 'play', 'company', 'novelty'].reduce((mask, key, i) => mask | (a[key as keyof PersonalityAxes] >= 0 ? 1 << i : 0), 0);
}
export function expressPersonality(f: PersonalityFoundation, facts: readonly RebootFact[], stage: RebootStage) {
  const owned = facts.filter(x => x.petId === f.petId && x.completed);
  const contexts = new Set(owned.map(x => x.context).filter(Boolean));
  const regions = new Set(owned.filter(x => x.kind === 'hand').map(x => x.touchRegion));
  // Small reversible expression hints, only after varied completed experiences.
  // Latent axes/identity never change, nor do absence, food or health records enter.
  const varied = contexts.size >= 3;
  const companyHint = varied && regions.has('head') && regions.has('body') ? .035 : 0;
  const noveltyHint = varied && new Set(owned.filter(x => x.kind === 'cushion_used').map(x => x.itemRevision)).size >= 2 ? .025 : 0;
  return { profileId: f.profileId, axes: { ...f.latent, company: Math.min(1, f.latent.company + companyHint), novelty: Math.min(1, f.latent.novelty + noveltyHint) },
    stage, maturity: stage === 'baby' ? 0 : stage === 'growing' ? .5 : 1,
    evidenceIds: owned.filter(x => x.kind === 'hand' || x.kind === 'cushion_used').slice(-4).map(x => x.eventId), companyHint, noveltyHint };
}
const b = (id: string, seconds: number, expression: BabyExpression): BabyBeat => ({ id, seconds, expression });
/** Existing supported body primitives, assembled into causal, visibly different episodes. */
const EPISODES: Record<PersonalityId, Record<string, readonly BabyBeat[]>> = {
  playful: {
    baby_scout: [b('scan', .7, 'curious'), b('tiny_hops', .9, 'excited'), b('paw_flick', 1, 'playful'), b('look_back', .9, 'content')],
    baby_discover: [b('sniff', .7, 'curious'), b('tiny_hops', 1, 'excited'), b('too_close', .5, 'surprised'), b('oops', .8, 'embarrassed'), b('look_back', .8, 'playful')],
    baby_sneak: [b('peek', .6, 'curious'), b('sneak', 1, 'playful'), b('paw_flick', .9, 'playful'), b('shake', .7, 'embarrassed')],
    baby_silly: [b('paw_flick', .8, 'playful'), b('oops', .7, 'surprised'), b('shake', .7, 'embarrassed'), b('tiny_hops', .9, 'excited')],
    baby_peek: [b('peek', .7, 'curious'), b('paw_offer', 1, 'playful'), b('tiny_hops', .8, 'excited'), b('look_back', .8, 'content')],
    rest: [b('cushion_knead', .8, 'curious'), b('body_wiggle', .8, 'playful'), b('cushion_sink', 1.4, 'content'), b('look_back', .8, 'content')],
  },
  warm: {
    baby_scout: [b('scan', .9, 'curious'), b('look_back', .9, 'content'), b('paw_offer', 1, 'excited'), b('lean', 1.3, 'content')],
    baby_discover: [b('sniff', .9, 'curious'), b('too_close', .5, 'surprised'), b('look_back', 1, 'content'), b('side_nuzzle', 1.2, 'content')],
    baby_sneak: [b('peek', .8, 'curious'), b('look_back', .8, 'excited'), b('head_lean', 1.3, 'content'), b('paw_offer', .9, 'content')],
    baby_silly: [b('paw_offer', .9, 'excited'), b('oops', .7, 'embarrassed'), b('head_lean', 1.2, 'content'), b('look_back', .9, 'content')],
    baby_peek: [b('peek', .8, 'curious'), b('side_nuzzle', 1.1, 'content'), b('paw_offer', .9, 'excited'), b('lean', 1.4, 'content')],
    rest: [b('cushion_knead', 1, 'curious'), b('side_nuzzle', 1, 'content'), b('yawn', .55, 'sleepy'), b('cushion_sink', 1.9, 'content'), b('look_back', 1.2, 'content')],
  },
  poised: {
    baby_scout: [b('scan', 1.2, 'curious'), b('sniff', .9, 'curious'), b('paw_flick', .8, 'playful'), b('look_back', .8, 'content')],
    baby_discover: [b('peek', .9, 'curious'), b('sniff', 1.1, 'curious'), b('tiny_hops', .55, 'excited'), b('too_close', .5, 'surprised'), b('shake', .6, 'embarrassed'), b('look_back', .8, 'playful')],
    baby_sneak: [b('sneak', 1.1, 'curious'), b('peek', .9, 'playful'), b('paw_flick', .8, 'curious'), b('look_back', .8, 'content')],
    baby_silly: [b('scan', .8, 'curious'), b('paw_flick', .7, 'playful'), b('oops', .6, 'embarrassed'), b('shake', .6, 'content')],
    baby_peek: [b('peek', 1, 'curious'), b('look_back', .8, 'playful'), b('side_nuzzle', 1, 'content'), b('scan', .9, 'curious')],
    rest: [b('scan', .9, 'curious'), b('cushion_knead', .9, 'curious'), b('cushion_sink', 1.6, 'content'), b('look_back', .9, 'content')],
  },
};
const TOUCH: Record<PersonalityId, readonly string[]> = {
  playful: ['body_wiggle', 'paw_offer', 'tickle', 'startle_then_lean', 'side_nuzzle', 'head_lean'],
  warm: ['head_lean', 'side_nuzzle', 'familiar_nuzzle', 'paw_offer', 'lean', 'body_wiggle'],
  poised: ['startle_then_lean', 'side_nuzzle', 'paw_offer', 'head_lean', 'familiar_nuzzle', 'lean'],
};
export const personalityReachability = (id: PersonalityId) => ({ autonomous: Object.keys(EPISODES[id]), touch: [...TOUCH[id]],
  expressions: ['curious', 'excited', 'playful', 'surprised', 'content', 'embarrassed', 'sleepy'] as BabyExpression[] });
export function personalityPlan(id: PersonalityId, kind: RebootIntent, region: TouchRegion, recent: readonly string[], context?: RebootIntent, familiar?: string): BabyPlan | undefined {
  if (kind === 'hand') {
    const candidates = TOUCH[id].filter(x => !recent.slice(-2).includes(x));
    const wanted = region === 'head' ? id === 'playful' ? 'paw_offer' : 'head_lean'
      : context?.startsWith('baby_') ? id === 'poised' ? 'startle_then_lean' : id === 'playful' ? 'tickle' : 'side_nuzzle'
        : familiar ? 'familiar_nuzzle' : id === 'playful' ? 'body_wiggle' : 'lean';
    const style = candidates.includes(wanted) ? wanted : candidates[hashPersonality(region + (context ?? '') + recent.join(':')) % candidates.length];
    const opening = id === 'playful' ? b('peek', .35, 'playful') : id === 'warm' ? b('head_lean', .45, 'content') : b('scan', .55, 'curious');
    const face: BabyExpression = style === 'tickle' ? 'playful' : style === 'startle_then_lean' ? 'surprised' : style === 'paw_offer' ? 'excited' : 'content';
    return { touchStyle: style, rememberedHandId: familiar, beats: [opening, b(style, 1.3, face), b(id === 'playful' ? 'paw_flick' : id === 'warm' ? 'lean' : 'look_back', .8, id === 'playful' ? 'playful' : 'content')] };
  }
  const beats = EPISODES[id][kind === 'cushion_changed' ? 'rest' : kind];
  return beats ? { beats } : undefined;
}
export function personalitySelection(id: PersonalityId, recent: readonly RebootIntent[], random: number, cushion: FloorPoint, axes: PersonalityAxes) {
  const weights = Object.keys(EPISODES[id]).filter(x => !recent.slice(-2).includes(x as RebootIntent)).map(kind => ({ kind: kind as RebootIntent,
    score: kind === 'rest' ? 1 - axes.play * .45 : kind === 'baby_peek' ? 1 + axes.company * .8
      : kind === 'baby_silly' ? 1 + axes.play * .9 : kind === 'baby_discover' || kind === 'baby_scout' ? 1 + axes.novelty * .7 : 1 }));
  let n = Math.max(0, Math.min(.999999, random)) * weights.reduce((s, x) => s + x.score, 0), chosen = weights[0];
  for (const x of weights) { chosen = x; n -= x.score; if (n < 0) break; }
  const kind = chosen.kind;
  const target = kind === 'rest' ? cushion : kind === 'baby_peek' ? { x: id === 'warm' ? 0 : id === 'poised' ? .8 : -.3, z: id === 'warm' ? 3.0 : 2.7 }
    : kind === 'baby_sneak' ? { x: -.9, z: -2.65 } : kind === 'baby_discover' ? { x: id === 'playful' ? .5 : id === 'warm' ? -.35 : .9, z: -2.4 }
      : kind === 'baby_scout' ? { x: cushion.x + (cushion.x > 0 ? -.85 : .85), z: cushion.z + (id === 'warm' ? .5 : .1) }
        : { x: id === 'playful' ? -1 : id === 'warm' ? .4 : 1, z: 1.5 };
  return { kind, target, weights, reason: `${kind}:axes/state/available-room-target;exclude_recent2`, profileId: id };
}
export function personalityPoseStyle(id: PersonalityId, expression: BabyExpression) {
  const warm = id === 'warm', poised = id === 'poised';
  return { bodyAmplitude: warm ? .7 : poised ? .72 : 1.15, gazeAside: poised ? .17 : warm ? -.045 : .08,
    happy: warm && ['content','excited'].includes(expression) ? .42 : 0,
    smile: warm ? .65 : poised ? .12 : .35,
    mischief: poised && ['curious','playful'].includes(expression) ? .38 : 0,
    patternId: `${id}:${expression}`, lookSeconds: warm ? .40 : poised ? .95 : .45,
    pauseSeconds: warm ? 5.2 : poised ? 4.5 : 3.1 };
}
