import type { BabyPlan } from './babyLife';
import type { PersonalityId } from './personality';

/** Presentation only: same claim, four beats, no extra rewards or emotion state. */
export const CELEBRATION_TUNING = Object.freeze({ readabilityMultiplier: 1.12, noticeSeconds: .55 });
export const isCelebrationBeat = (id: string) => id.startsWith('cheer_');
export const celebrationTiming = (profile: PersonalityId) => ({
  look: profile === 'playful' ? .38 : profile === 'warm' ? .68 : .9,
  recover: profile === 'warm' ? 1.65 : profile === 'poised' ? 1.05 : 1.25,
});

export function celebrationPlan(profile: PersonalityId, variation = 0): BabyPlan {
  const notice = { id: 'cheer_notice', seconds: CELEBRATION_TUNING.noticeSeconds, expression: 'excited' as const };
  const finish = { id: 'cheer_settle', seconds: profile === 'warm' ? 1.65 : .95, expression: 'content' as const };
  return { beats: profile === 'playful' ? [notice,
    { id: 'cheer_bounce', seconds: 1.2, expression: 'excited' },
    { id: variation ? 'cheer_playful_wave' : 'cheer_peek', seconds: 1.25, expression: 'playful' }, finish]
    : profile === 'warm' ? [notice,
      { id: 'cheer_share', seconds: 2.05 + variation * .15, expression: 'excited' },
      { id: 'cheer_nod', seconds: 1.2, expression: 'content' }, finish]
      : [notice, { id: 'cheer_salute', seconds: 1.55, expression: 'content' },
        { id: variation ? 'cheer_nod' : 'cheer_glance', seconds: 1.1, expression: 'content' }, finish] };
}
const smooth = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
type Face = { Surprised: number; Happy: number; Smile: number; Open: number; Lift: number };
const neutral: Face = { Surprised: .08, Happy: 0, Smile: .1, Open: 0, Lift: .12 };
/** One readable intention, including anticipation and exit. Shared symmetric keys only. */
export function celebrationAct(id: string, progress: number, profile: PersonalityId) {
  const p = Math.max(0, Math.min(1, progress)), bell = Math.sin(Math.PI * p);
  const envelope = smooth(p / .22) * (1 - smooth((p - .7) / .3));
  const intro = id === 'cheer_intro', notice = id === 'cheer_notice', ending = id === 'cheer_exit';
  let x = 0, z = 0, pitch = 0, yaw = 0, roll = 0, pawLift = 0, pawReach = 0, compression = 0;
  let earLift = 0, earForward = 0, earAside = 0;
  let face: Face = neutral;
  if (profile === 'playful') {
    face = { Surprised: .4, Happy: .18, Smile: .6, Open: .75, Lift: .78 };
    earLift = .46 * envelope; earForward = -.27 * envelope;
    if (intro || notice) { pitch = -.09 * bell; compression = .035 * bell; face = { ...face, Surprised: .67, Happy: 0, Open: .36 }; }
    if (id === 'cheer_bounce') { roll = -.055 * bell; face = { ...face, Happy: .6 * envelope, Open: .85 }; }
    if (id === 'cheer_peek' || id === 'cheer_playful_wave') {
      yaw = -.3 * bell; roll = -.15 * bell; x = -.08 * bell;
      pawLift = .30 * envelope; pawReach = .16 * envelope;
      face = { ...face, Surprised: .34, Happy: .12, Open: .32, Smile: .85 };
      earAside = .16 * bell;
    }
    if (id === 'cheer_settle') { pitch = .07 * bell; face = { ...face, Happy: .35 * bell, Open: .15, Smile: .75 }; }
  } else if (profile === 'warm') {
    // Two planted paws: offer shared delight, never lean on an absent hand.
    face = { Surprised: .28, Happy: .15, Smile: .94, Open: .24, Lift: .5 };
    earLift = -.28 * envelope; earForward = -.14 * envelope;
    if (intro || notice) { pitch = -.055 * bell; face = { ...face, Surprised: .45, Happy: 0 }; earLift = .23 * bell; }
    if (id === 'cheer_share') {
      z = .10 * envelope; pitch = .16 * envelope; compression = .04 * envelope;
      face = { ...face, Happy: .60 * envelope, Open: .38 * envelope };
    }
    if (id === 'cheer_nod') { pitch = .20 * bell; compression = .025 * bell; face = { ...face, Happy: .72 * bell, Open: .08 }; }
    if (id === 'cheer_settle') { z = .045 * (1 - smooth(p)); pitch = .055 * bell; face = { ...face, Happy: .12, Open: .10 }; }
  } else {
    face = { Surprised: .12, Happy: .06, Smile: .55, Open: .08, Lift: .28 };
    earLift = .18 * envelope; earForward = -.06 * envelope;
    if (intro || notice) { yaw = .34 * bell; pitch = -.075 * bell; earAside = .25 * bell; face = { ...face, Surprised: .36, Lift: .65, Smile: .25 }; }
    if (id === 'cheer_salute') {
      x = -.13 * envelope; pitch = -.10 * envelope; yaw = .25 * envelope;
      pawLift = .26 * smooth((p - .10) / .20) * (1 - smooth((p - .65) / .35));
      pawReach = .52 * envelope; // Rest paw z=.10: reach past the belly before lifting; keep skin attachment. earAside = .22 * envelope;
      face = { ...face, Smile: .85 * envelope + .15, Happy: .12, Lift: .40 };
    }
    if (id === 'cheer_glance' || id === 'cheer_nod') { yaw = .42 * bell; pitch = .08 * bell; earAside = -.22 * bell; }
    if (id === 'cheer_settle') { yaw = .24 * bell; face = { ...face, Smile: .55, Happy: 0 }; }
  }
  if (ending) {
    const remain = 1 - smooth(p);
    face = { ...neutral, Smile: (profile === 'warm' ? .84 : .58) * remain + .1, Happy: profile === 'warm' ? .18 * remain : 0 };
    earLift = (profile === 'warm' ? -.18 : .12) * remain; earForward = -.06 * remain;
    yaw = profile === 'poised' ? .2 * bell : 0; pitch = profile === 'warm' ? .065 * bell : 0;
  }
  return { x, z, pitch, yaw, roll, pawLift, pawReach, compression, support: pawLift > 0,
    earLift, earForward, earAside, face };
}
