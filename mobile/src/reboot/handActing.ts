import type { BabyExpression, RebootIntent } from './contracts';
import type { PersonalityId } from './personality';

export type HandActingPlan = Readonly<{ profile: PersonalityId; style: string; context?: RebootIntent;
  familiar: boolean; side: number; quietPeriod: number; recoverySeconds: number }>;
export type HandActingPose = Readonly<{ beat: string; expression: BabyExpression; seconds: number;
  x: number; z: number; yaw: number; roll: number; pitch: number; compression: number;
  pawLift: number; pawReach: number; supportX: number; wink: number; faceStrength: number }>;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const t = clamp(x); return t * t * (3 - 2 * t); };
const pulse = (t: number, start: number, duration: number) => t > start && t < start + duration ? Math.sin((t - start) / duration * Math.PI) : 0;

/** Resolve context/history once per contact; no randomness or catalog reads in a frame. */
export function makeHandActingPlan(profile: PersonalityId, style: string, context: RebootIntent | undefined,
  familiar: boolean, recent: readonly string[]): HandActingPlan {
  let seed = 2166136261;
  for (const c of `${style}:${context ?? ''}:${familiar}:${recent.slice(-2).join(':')}`) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619);
  return { profile, style, context, familiar, side: seed & 1 ? 1 : -1, quietPeriod: 11 + ((seed >>> 0) % 4),
    recoverySeconds: profile === 'warm' ? 1.9 : profile === 'poised' ? 1.25 : 1.35 };
}

/** Brief response then restful contact, never the last beat frozen or replayed. */
export function sampleHandContact(plan: HandActingPlan, elapsed: number): HandActingPose {
  const t = Math.max(0, elapsed), enter = ease(t / .55), side = plan.side;
  const quietTime = Math.max(0, t - 4), glance = t > 4 ? pulse(quietTime % plan.quietPeriod, plan.quietPeriod - 1.2, 1.1) : 0;
  const breath = Math.sin(t * 1.5) * .004;
  if (plan.profile === 'playful') {
    const tap = pulse(t, .4, plan.style === 'tickle' ? .85 : 1.05), check = ease((t - 1.35) / .55) * (1 - ease((t - 2.6) / .7));
    const wink = pulse(t, 1.2, .23) * .93, wriggle = plan.style === 'body_wiggle' ? pulse(t, .1, .6) : 0;
    return { beat: t < .4 ? 'peek' : t < 1.45 ? 'paw_offer' : t < 3.3 ? 'paw_flick' : glance ? 'look_back' : 'hand_breathe',
      expression: t < 1.45 ? 'excited' : t < 2.8 ? 'playful' : glance ? 'curious' : 'content', seconds: t,
      x: side * (.14 * check + .025 * enter), z: .025 * enter - .065 * check,
      yaw: side * (.36 * check + .10 * enter - .11 * glance), roll: side * (.085 * tap + .07 * wriggle), pitch: -.035 * tap,
      compression: .018 * tap, pawLift: .11 * tap, pawReach: .21 * tap, supportX: -.115 * pulse(t, .18, 1.5),
      wink, faceStrength: t < 3.3 ? .8 : .32 + glance * .2 };
  }
  if (plan.profile === 'warm') {
    const settle = ease((t - .35) / 1.45), nuzzle = pulse(t, .55, 1.35);
    const cheek = plan.style === 'head_lean' ? .78 : 1;
    return { beat: t < .5 ? 'head_lean' : t < 2.1 ? 'side_nuzzle' : glance ? 'look_back' : 'hand_breathe',
      expression: glance ? 'curious' : 'content', seconds: t,
      x: side * (.10 * settle + .025 * nuzzle) * cheek, z: (.145 + (plan.familiar ? .015 : 0)) * settle + breath * settle,
      yaw: -side * .30 * settle + .07 * glance, roll: -side * .15 * settle, pitch: .035 * settle,
      compression: .042 * settle, pawLift: .035 * pulse(t, .2, .8), pawReach: .025 * enter, supportX: -.07 * pulse(t, .05, 1.05),
      wink: 0, faceStrength: .72 - .14 * settle + .14 * glance };
  }
  const inspect = pulse(t, .15, .95), contact = ease((t - .65) / .7), check = pulse(t, 2.2, .8);
  const startle = plan.style === 'startle_then_lean' ? pulse(t, 0, .45) : 0;
  return { beat: t < .8 ? 'scan' : t < 1.55 ? 'paw_offer' : t < 3.1 ? 'look_back' : glance ? 'scan' : 'hand_breathe',
    expression: startle > .3 ? 'surprised' : t < .8 || check > .2 || glance > .1 ? 'curious' : 'content', seconds: t,
    x: side * .065 * contact, z: .035 * contact - .035 * startle, yaw: side * (.42 * contact + .09 * inspect - .13 * check + .10 * glance),
    roll: .012 * side * contact, pitch: .018 * inspect - .045 * startle, compression: .008 * contact,
    pawLift: .065 * pulse(t, .7, .75), pawReach: .11 * pulse(t, .7, .75), supportX: -.10 * pulse(t, .45, 1.15), wink: 0,
    faceStrength: .56 + .22 * Math.max(inspect, check, glance) };
}

/** Start from the actual release sample, including release mid-gesture. */
export function sampleHandRelease(plan: HandActingPlan, from: HandActingPose, elapsed: number): HandActingPose {
  const weight = 1 - ease(elapsed / plan.recoverySeconds);
  return { ...from, beat: 'hand_release', seconds: elapsed, expression: plan.profile === 'poised' ? 'curious' : 'content',
    x: from.x * weight, z: from.z * weight, yaw: from.yaw * weight, roll: from.roll * weight, pitch: from.pitch * weight,
    compression: from.compression * weight, pawLift: from.pawLift * weight, pawReach: from.pawReach * weight,
    supportX: weight === 0 ? 0 : from.supportX * weight, wink: from.wink * weight, faceStrength: from.faceStrength * weight };
}
