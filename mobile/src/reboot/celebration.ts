import type { BabyPlan } from './babyLife';
import type { PersonalityId } from './personality';

/** Reversible presentation tuning. No health, reward or game-clock decisions. */
export const CELEBRATION_TUNING = Object.freeze({ readabilityMultiplier: 1.12, noticeSeconds: .55 });
export const isCelebrationBeat = (id: string) => id.startsWith('cheer_');

export function celebrationPlan(profile: PersonalityId, variation = 0): BabyPlan {
  const notice = { id: 'cheer_notice', seconds: CELEBRATION_TUNING.noticeSeconds, expression: 'excited' as const };
  const finish = { id: 'cheer_settle', seconds: profile === 'warm' ? 1.5 : .95, expression: 'content' as const };
  return { beats: profile === 'playful' ? [notice,
    { id: 'cheer_bounce', seconds: 1.15, expression: 'excited' },
    { id: variation ? 'cheer_playful_wave' : 'cheer_peek', seconds: 1.05, expression: 'playful' }, finish]
    : profile === 'warm' ? [notice,
      { id: 'cheer_share', seconds: 1.8 + variation * .2, expression: 'excited' },
      { id: 'cheer_nod', seconds: 1.05, expression: 'content' }, finish]
      : [notice, { id: 'cheer_salute', seconds: 1.3, expression: 'content' },
        { id: variation ? 'cheer_nod' : 'cheer_glance', seconds: .95, expression: 'content' }, finish] };
}

const smooth = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
/** One intent drives eyes/ears/body/paw. Curves start and end at support, not a held wink. */
export function celebrationAct(id: string, progress: number, profile: PersonalityId) {
  const p = Math.max(0, Math.min(1, progress));
  const envelope = smooth(p / .2) * (1 - smooth((p - .72) / .28));
  const bell = Math.sin(Math.PI * p);
  const wave = id === 'cheer_salute' || id === 'cheer_playful_wave' || id === 'cheer_share';
  const pawLift = wave ? (id === 'cheer_share' ? .11 : .23) * envelope : 0;
  const supportX = wave ? -.065 * envelope : 0;
  return { x: supportX, z: id === 'cheer_share' ? .045 * envelope : 0,
    pitch: id === 'cheer_nod' ? .065 * bell : id === 'cheer_salute' ? -.045 * envelope : 0,
    yaw: id === 'cheer_glance' ? .13 * bell : id === 'cheer_peek' ? -.14 * bell : 0,
    roll: id === 'cheer_peek' ? -.045 * bell : 0, pawLift,
    pawReach: wave ? .07 * envelope : 0, support: wave,
    earLift: (id === 'cheer_notice' ? .23 * bell : id === 'cheer_settle' ? .10 * (1 - smooth(p)) : .23 * envelope),
    face: profile === 'playful' ? { Surprised: .25, Happy: .48, Smile: .55, Open: .55, Lift: .55 }
      : profile === 'warm' ? { Surprised: .28, Happy: .3, Smile: .72, Open: .28, Lift: .42 }
        : { Surprised: .19, Happy: .18, Smile: .58, Open: .12, Lift: .3 } };
}
