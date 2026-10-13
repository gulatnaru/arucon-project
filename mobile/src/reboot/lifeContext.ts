import type { BabyPlan } from './babyLife';
import type { PersonalityId } from './personality';
import { celebrationPlan } from './celebration';

/** Presentation-only synthetic observations. Never connected to a health reader. */
export type LifeContext = Readonly<{
  source: 'synthetic'; eventId: string; revision: number; day: number;
  startMs: number; endMs: number; queriedAtMs: number; localHour: number;
  quality: 'valid' | 'none' | 'delayed' | 'failed' | 'permission_unknown' | 'insufficient';
  evidence: readonly string[]; personalGoal?: number; observedSteps?: number;
  completedRun?: string; sleepMinutes?: number; personalSleepMinutes?: number;
  selfReportedPoorSleep?: boolean; choseRest?: boolean;
}>;
export type ContextIntent = 'invite' | 'goal' | 'run' | 'care_reported' | 'care_recorded' | 'rest';
export type ContextCue = Readonly<{ eventId: string; revision: number; day: number; intent: ContextIntent; text: string; plan: BabyPlan; speechBeat: string }>;
export type ContextHistory = { version: 1; day: number; seen: Record<string, number>; invited: boolean; rested: boolean; avoidInvites?: boolean; lessTalk: boolean; lastSpokenAtMs: number };
export const CONTEXT_TUNING = { maxAgeMs: 20 * 60_000, autoGapMs: 10 * 60_000, maxEventsPerDay: 64, latestSyntheticDay: 30_000 } as const;
export const emptyContextHistory = (): ContextHistory => ({ version: 1, day: 0, seen: {}, invited: false, rested: false, lessTalk: false, lastSpokenAtMs: 0 });
export function validContextHistory(h: ContextHistory): boolean {
  return h.version === 1 && Number.isSafeInteger(h.day) && h.day >= 0 && h.day <= CONTEXT_TUNING.latestSyntheticDay &&
    typeof h.invited === 'boolean' && typeof h.rested === 'boolean' && (h.avoidInvites === undefined || typeof h.avoidInvites === 'boolean') && typeof h.lessTalk === 'boolean' && Number.isSafeInteger(h.lastSpokenAtMs) && h.lastSpokenAtMs >= 0 &&
    !!h.seen && typeof h.seen === 'object' && !Array.isArray(h.seen) && Object.keys(h.seen).length <= CONTEXT_TUNING.maxEventsPerDay &&
    Object.entries(h.seen).every(([k, v]) => /^synthetic:[a-z_]+:[0-9]+$/u.test(k) && Number.isSafeInteger(v) && v >= 0);
}
const words: Record<ContextIntent, Record<PersonalityId, string>> = {
  invite: { playful: '기운 있으면, 같이 한 바퀴?', warm: '괜찮으면 잠깐 걸을까?', poised: '목표가 조금 남았네. 기운 있으면 같이 갈까?' },
  goal: { playful: '해냈다! 발이 신났네!', warm: '네 목표를 채웠네. 같이 기뻐!', poised: '다 했네? 제법인데.' },
  run: { playful: '달리고 왔구나! 통통!', warm: '달리기 마쳤네. 잠깐 같이 쉬자.', poised: '다녀왔네. 이제 좀 쉬어.' },
  care_reported: { playful: '잠을 설쳤구나. 오늘은 살살 놀자.', warm: '잠을 설쳤구나. 옆에 있을게.', poised: '잠을 설쳤다며. 오늘은 쉬어도 돼.' },
  care_recorded: { playful: '수면 기록이 짧네. 오늘은 살살?', warm: '기준보다 짧은 기록이네. 지금은 어때?', poised: '기록은 짧네. 무리할 필요는 없어.' },
  rest: { playful: '좋아! 오늘은 느긋하게.', warm: '응, 편하게 쉬자.', poised: '좋아. 오늘은 쉬는 거야.' },
};
function plan(intent: ContextIntent, profile: PersonalityId, variation = 0): BabyPlan {
  if (intent === 'goal') return celebrationPlan(profile, variation);
  const celebration = intent === 'run';
  if (celebration) return { beats: profile === 'playful' ? [
    { id: 'tiny_hops', seconds: 1, expression: 'excited' }, { id: 'paw_flick', seconds: .8, expression: 'playful' }, { id: 'look_back', seconds: 2.8, expression: 'content' },
  ] : profile === 'warm' ? [
    { id: 'paw_offer', seconds: 1, expression: 'excited' }, { id: 'lean', seconds: 1.4, expression: 'content' }, { id: 'look_back', seconds: 2.8, expression: 'content' },
  ] : [
    { id: 'scan', seconds: .8, expression: 'curious' }, { id: 'paw_offer', seconds: 1.1, expression: 'excited' }, { id: 'look_back', seconds: 3, expression: 'playful' },
  ] };
  if (intent === 'invite') return { beats: [
    { id: profile === 'poised' ? 'scan' : 'peek', seconds: .8, expression: 'curious' },
    { id: 'paw_offer', seconds: 1.1, expression: profile === 'playful' ? 'excited' : 'curious' },
    { id: 'look_back', seconds: 3.5, expression: 'content' },
  ] };
  return { beats: [
    { id: profile === 'poised' ? 'scan' : 'peek', seconds: .8, expression: 'curious' },
    { id: profile === 'warm' ? 'side_nuzzle' : profile === 'playful' ? 'lean' : 'look_back', seconds: 2, expression: 'content' },
    { id: 'look_back', seconds: 3.6, expression: 'content' },
  ] };
}

/** No domain state or medical thresholds; UNKNOWN cannot become zero activity. */
export function evaluateLifeContext(c: LifeContext, h: ContextHistory, profile: PersonalityId, nowMs: number): { cue?: ContextCue; reason: string; safetyIntent?: ContextIntent } {
  if (c.source !== 'synthetic' || !/^synthetic:[a-z_]+:[0-9]+$/u.test(c.eventId) || !Number.isSafeInteger(c.revision) || c.revision < 0 || !Number.isSafeInteger(c.day) || c.day < h.day || c.day > CONTEXT_TUNING.latestSyntheticDay ||
      ![c.startMs, c.endMs, c.queriedAtMs, nowMs].every(Number.isSafeInteger) || c.startMs > c.endMs || c.endMs > c.queriedAtMs || c.queriedAtMs > nowMs || nowMs - c.queriedAtMs > CONTEXT_TUNING.maxAgeMs ||
      !Number.isInteger(c.localHour) || c.localHour < 0 || c.localHour > 23 || !Array.isArray(c.evidence) || c.evidence.length > 32 ||
      !c.evidence.every(x => /^synthetic:[a-z_]+:[0-9]+$/u.test(x)) ||
      [c.selfReportedPoorSleep, c.choseRest].some(x => x !== undefined && typeof x !== 'boolean') ||
      [c.personalGoal, c.observedSteps, c.sleepMinutes, c.personalSleepMinutes].some(x => x !== undefined && (!Number.isFinite(x) || x < 0))) return { reason: 'INVALID_OR_STALE' };
  if (c.quality !== 'valid' || !c.evidence.length) return { reason: 'UNKNOWN_NOT_DEFICIT' };
  const sameDay = h.day === c.day;
  if (sameDay && h.seen[c.eventId] !== undefined) return { reason: 'ALREADY_ACKNOWLEDGED_EVENT' };
  if (sameDay && Object.keys(h.seen).length >= CONTEXT_TUNING.maxEventsPerDay) return { reason: 'DAILY_HISTORY_FULL' };
  let intent: ContextIntent | undefined;
  if (c.choseRest) intent = 'rest';
  else if (c.selfReportedPoorSleep) intent = 'care_reported';
  else if (c.sleepMinutes !== undefined && c.personalSleepMinutes !== undefined && Number.isFinite(c.sleepMinutes) && Number.isFinite(c.personalSleepMinutes) && c.sleepMinutes > 0 && c.personalSleepMinutes > 0 && c.sleepMinutes < c.personalSleepMinutes) intent = 'care_recorded';
  else if (Number.isFinite(c.personalGoal) && c.personalGoal! > 0 && Number.isFinite(c.observedSteps) && c.observedSteps! >= 0) {
    if (c.observedSteps! >= c.personalGoal!) intent = 'goal';
    else if (c.completedRun && c.evidence.includes(c.completedRun)) intent = 'run';
    else if (c.localHour >= 18 && c.localHour <= 22) intent = 'invite';
  }
  if (!intent && c.completedRun && c.evidence.includes(c.completedRun)) intent = 'run';
  if (!intent) return { reason: 'NO_SUPPORTED_MEANING' };
  const safetyIntent = ['care_reported', 'care_recorded'].includes(intent) ? intent : undefined;
  if (intent === 'invite' && (h.lessTalk || sameDay && (h.rested || h.avoidInvites || h.invited))) return { reason: 'REST_OR_INVITE_LIMIT' };
  if (h.lessTalk && intent !== 'rest') return { reason: 'LESS_TALK_CHOICE', safetyIntent };
  if (sameDay && intent !== 'rest' && intent !== 'care_reported' && nowMs - h.lastSpokenAtMs < CONTEXT_TUNING.autoGapMs) return { reason: 'HEALTH_TOPIC_QUIET_GAP', safetyIntent };
  const variation = (c.day + Object.keys(h.seen).length) % 2;
  const acting = plan(intent, profile, variation);
  const goalWords = { playful: ['해냈네! 나도 신나!', '목표 채웠네! 같이 신나자!'],
    warm: ['오늘 목표 채웠네. 잘했어.', '해냈구나. 나도 기뻐.'],
    poised: ['흠, 해냈네. 제법인데?', '목표 채웠네. 잘했어.'] };
  return { cue: { eventId: c.eventId, revision: c.revision, day: c.day, intent, text: intent === 'goal' ? goalWords[profile][variation] : words[intent][profile], plan: acting, speechBeat: acting.beats[1].id }, reason: 'SUPPORTED_SYNTHETIC_FACT' };
}

export function acknowledgeContext(h: ContextHistory, cue: ContextCue, atMs: number): ContextHistory {
  const next = h.day === cue.day ? { ...h, seen: { ...h.seen } } : { ...emptyContextHistory(), day: cue.day, lessTalk: h.lessTalk };
  next.seen[cue.eventId] = cue.revision; next.invited ||= cue.intent === 'invite';
  next.rested ||= cue.intent === 'rest'; next.avoidInvites ||= ['care_reported', 'care_recorded'].includes(cue.intent); next.lastSpokenAtMs = atMs;
  return next;
}
export const SYNTHETIC_CONTEXT_CASES = [
  ['remaining', '저녁 · 내 걷기 목표가 남음'], ['goal', '내 활동 목표 달성'], ['run', '확정된 달리기 종료'],
  ['reported_sleep', '잠을 설쳤다고 직접 알림'], ['short_sleep', '개인 기준보다 짧은 수면 기록'], ['rest', '오늘은 쉬기'],
  ['missing', '기록 없음'], ['delayed', '동기화 지연'], ['failed', '조회 실패'], ['permission', '읽기 권한 불명확'], ['morning', '오전 · 목표가 남음'],
] as const;
export type SyntheticCase = typeof SYNTHETIC_CONTEXT_CASES[number][0];
/** This clock describes synthetic observations only. Never passed to a game service. */
export function syntheticLifeContext(name: SyntheticCase, day: number, minuteOffset = 0): LifeContext {
  const at = Date.UTC(2026, 9, 12 + day, name === 'morning' ? 0 : 12) + minuteOffset * 60_000, session = `synthetic:run_session:${day}`;
  const c: LifeContext = { source: 'synthetic', eventId: `synthetic:${name}:${day}`, revision: 1, day,
    startMs: Date.UTC(2026, 9, 12 + day, -9), endMs: at, queriedAtMs: at, localHour: ((name === 'morning' ? 9 : 21) + Math.floor(minuteOffset / 60)) % 24,
    quality: name === 'missing' ? 'none' : name === 'delayed' ? 'delayed' : name === 'failed' ? 'failed' : name === 'permission' ? 'permission_unknown' : 'valid',
    evidence: name === 'missing' ? [] : [session, `synthetic:observation:${day}`],
    ...(['remaining', 'goal', 'morning'].includes(name) ? { observedSteps: name === 'goal' ? 6400 : 2100, personalGoal: 6000 } : {}),
    ...(name === 'run' ? { completedRun: session } : {}),
    ...(name === 'short_sleep' ? { sleepMinutes: 320, personalSleepMinutes: 420 } : {}),
    ...(name === 'reported_sleep' ? { selfReportedPoorSleep: true, observedSteps: 1000, personalGoal: 6000 } : {}),
    ...(name === 'rest' ? { choseRest: true } : {}),
  }; return c;
}
