import type { FloorPoint } from '../scene/types';
import type { BabyExpression, RebootFact, RebootIntent } from './contracts';
import type { BabyBeat, BabyPlan } from './babyLife';
import type { PersonalityAxes, PersonalityId } from './personality';

export type LivingFocus = 'window' | 'plant' | 'paws' | 'user' | 'cushion' | 'quiet_floor';
export type LivingOutcome = 'discovered' | 'startled' | 'amused' | 'settled' | 'shared';
export type LivingScene = Readonly<{ id: string; focus: LivingFocus; focusPoint: FloorPoint; target: FloorPoint; kind: RebootIntent;
  plan: BabyPlan; outcome: LivingOutcome; reason: string; evidenceIds: readonly string[]; pauseSeconds: number;
  speechBeat?: string; meaning: string; lines: readonly string[] }>;
export const LIVING_TUNING = { recentScenes: 3, speechGapMs: 20_000, handMemoryMs: 45 * 60_000,
  restAfterActiveScenes: 4, quietSeconds: [9, 14] as const, version: 'REBOOT05_CAUSAL_1' };
const b = (id: string, seconds: number, expression: BabyExpression): BabyBeat => ({ id, seconds, expression });
const texts: Record<LivingFocus, Record<PersonalityId, readonly string[]>> = {
  window: { playful: ['저쪽, 환하다!', '빛 있는 데도 봤어.', '이쪽 봐. 환하지?', '구경하고 왔지!'],
    warm: ['저기에도 빛이 왔네.', '같이 구경할래?', '여기서도 창이 보여.', '구경하다 너도 봤어.'],
    poised: ['저 빛 쪽 좀 볼래.', '창가부터 보고 올게.', '흠, 저쪽은 환하네.', '잠깐 구경했어.'] },
  plant: { playful: ['저 잎 좀 봐!', '더 가까이 보고 싶어.', '발끝으로 살짝 왔어.', '구경할 게 또 있네!'],
    warm: ['초록 잎도 보자.', '천천히 구경했어.', '너도 저쪽 볼래?', '이쪽이 궁금했어.'],
    poised: ['저 잎은 어떻게 생겼지?', '가까이선 다르네.', '아직 좀 더 볼래.', '흠, 이제 알겠어.'] },
  paws: { playful: ['앗, 발이 먼저!', '못 본 걸로 해 줘.', '다시 하면 되지!', '이번엔 살짝만.'],
    warm: ['앗, 조금 헛갔네.', '나도 웃음이 났어.', '천천히 다시 해 볼래.', '괜찮아, 정리했어.'],
    poised: ['아무 일도 없었어.', '발이 먼저 간 거야.', '…다시 볼게.', '못 본 걸로 해.'] },
  user: { playful: ['이번엔 내가 왔어!', '나도 여기 앉을래.', '발로 인사할게!', '봤어? 살짝 왔지.'],
    warm: ['여기 같이 있을래.', '옆에 있어도 돼?', '그냥 편하게 있자.', '너도 한번 봤어.'],
    poised: ['여기까지만 와 볼게.', '잠깐 들른 거야.', '조용히 옆에 있을게.', '보고 있던 데로 갈게.'] },
  cushion: { playful: ['폭 들어가 볼래!', '여기도 폭신해.', '잠깐만 편하게.', '발부터 정리할게.'],
    warm: ['여기서 편하게 쉬자.', '폭신한 자리 찾았어.', '조금만 이렇게 있을래.', '자리를 잡았어.'],
    poised: ['여기가 낫겠네.', '이 자리 좀 쓸게.', '잠깐 몸을 내려놓을래.', '조용히 쉬었다 갈게.'] },
  quiet_floor: { playful: ['여기도 한번 앉아 볼래.', '잠깐만 가만히.', '발이 쉬는 중!', '이따 또 구경할래.'],
    warm: ['말 없이 같이 있어도 좋아.', '여기 편하게 앉았어.', '조금만 느긋하게.', '이 자리에 있을래.'],
    poised: ['지금은 그냥 있을래.', '여기도 괜찮네.', '조용해서 좋아.', '구경은 잠깐 뒤에.'] },
};

function plan(focus: LivingFocus, id: PersonalityId, variant: number, familiar = false): BabyPlan {
  const playful = id === 'playful', warm = id === 'warm';
  if (focus === 'cushion') return { beats: [b('cushion_knead', playful ? 1.1 : 1.6, 'curious'),
    b('cushion_sink', warm ? 13 : playful ? 8 : 11, 'content'), b('look_back', 1.1, 'content')] };
  if (focus === 'quiet_floor') return { beats: [b('scan', 1.4, 'curious'), b('settle_floor', 11 + variant * 3, 'content'), b('look_back', .8, 'content')] };
  if (focus === 'user') return { beats: playful ? [b(familiar ? 'paw_offer' : 'peek', .8, familiar ? 'excited' : 'curious'), b('paw_offer', .9, 'excited'), b('paw_flick', .7, 'playful'), b('settle_floor', 5, 'content'), b('look_back', .8, 'curious')]
    : warm ? [b(familiar ? 'look_back' : 'peek', familiar ? .65 : 1, familiar ? 'content' : 'curious'), b('look_back', 1, 'content'), b('lean', 1.2, 'content'), b('settle_floor', familiar ? 12 : 9, 'content')]
      : [b('scan', 1.4, 'curious'), b('paw_offer', .7, 'content'), b('look_back', .65, 'curious'), b('settle_floor', 5, 'content'), b('scan', 1.4, 'curious')] };
  if (focus === 'paws') return { beats: [b(playful ? 'paw_flick' : 'paw_offer', 1, playful ? 'playful' : 'curious'),
    b('oops', .7, 'surprised'), b('shake', 1.1, 'embarrassed'), b('look_back', 1.2, playful ? 'playful' : 'content')] };
  const notice = focus === 'plant' ? 'peek' : 'scan';
  return { beats: [b(notice, warm ? 1.3 : 1.1, 'curious'), b(variant ? 'sniff' : 'sneak', warm ? 1.4 : 1.1, 'curious'),
    ...(playful ? [b('tiny_hops', .8, 'excited'), b('too_close', .6, 'surprised'), b('shake', .8, 'embarrassed')]
      : warm ? [b('paw_offer', .8, 'excited')] : [b('paw_flick', .8, 'playful')]),
    b('look_back', warm ? 1.3 : .9, playful ? 'excited' : 'curious'),
    ...(warm || variant ? [b('settle_floor', warm ? 4.5 : 3, 'content')] : [])] };
}

/** Score real available targets, the last outcome and completed owned experience.
 * Randomness only breaks near ties/chooses a fresh variation, not the motive. */
export function selectLivingScene(input: { profile: PersonalityId; axes: PersonalityAxes; position: FloorPoint;
  cushion: FloorPoint & { revision: number }; petId: string; facts: readonly RebootFact[]; recent: readonly string[];
  lastOutcome?: LivingOutcome; activeScenes: number; random: number; atMs: number }): LivingScene {
  const { profile, axes, cushion } = input;
  const owned = input.facts.filter(f => f.petId === input.petId && f.completed && f.atMs <= input.atMs);
  const hand = owned.filter(f => f.kind === 'hand' && input.atMs - f.atMs < LIVING_TUNING.handMemoryMs).at(-1);
  const knownCushion = owned.filter(f => f.kind === 'cushion_used' && f.itemRevision === cushion.revision).at(-1);
  const choices: { focus: LivingFocus; score: number; target: FloorPoint; focusPoint: FloorPoint; kind: RebootIntent; outcome: LivingOutcome; reason: string }[] = [
    { focus: 'window', score: 1.1 + axes.novelty * .8 + (input.lastOutcome === 'shared' && profile === 'poised' ? .5 : 0), target: { x: -.35, z: -2.25 }, focusPoint: { x: -.45, z: -4.65 }, kind: 'baby_discover', outcome: 'discovered', reason: 'window_visible_interest' },
    { focus: 'plant', score: 1 + axes.novelty * .55 + axes.play * .25, target: { x: -.9, z: -2.35 }, focusPoint: { x: -2.8, z: -3.65 }, kind: 'baby_sneak', outcome: 'discovered', reason: 'plant_visible_interest' },
    { focus: 'paws', score: .75 + axes.play * .8 + (input.lastOutcome === 'discovered' ? .65 : input.lastOutcome === 'shared' && profile === 'playful' ? .4 : 0), target: { x: input.position.x, z: input.position.z }, focusPoint: input.position, kind: 'baby_silly', outcome: 'amused', reason: 'discovery_to_small_play' },
    { focus: 'user', score: 1 + axes.company * .8 + (hand ? .5 : 0), target: { x: profile === 'poised' ? .65 : profile === 'warm' ? 0 : -.25, z: 2.7 }, focusPoint: { x: 0, z: 4.3 }, kind: 'baby_peek', outcome: 'settled', reason: hand ? 'completed_hand_then_company' : 'check_user_without_pressure' },
    { focus: 'cushion', score: .65 + input.activeScenes * .28 + (input.lastOutcome === 'startled' ? .7 : input.lastOutcome === 'amused' ? .3 : 0) + (knownCushion ? .25 : 0), target: cushion, focusPoint: cushion, kind: 'rest', outcome: 'settled', reason: knownCushion ? 'known_current_cushion' : 'activity_then_cushion' },
    { focus: 'quiet_floor', score: .8 + input.activeScenes * .17 - axes.play * .15, target: { x: .8, z: 1.2 }, focusPoint: { x: 0, z: 4.3 }, kind: 'baby_scout', outcome: 'settled', reason: 'choose_another_quiet_place' },
  ];
  const sorted = choices.map((c, i) => ({ ...c, score: c.score
    - input.recent.slice(-2).filter(s => s.startsWith(c.focus + ':')).length * 2.5
    - input.recent.slice(-12).filter(s => s.startsWith(c.focus + ':')).length * .35
    + Math.min(6, input.recent.length - input.recent.map(s => s.split(':')[0]).lastIndexOf(c.focus)) * .12
    + (input.activeScenes >= LIVING_TUNING.restAfterActiveScenes && ['cushion', 'quiet_floor'].includes(c.focus) ? 2 : 0)
    + ((input.random * (i + 3)) % 1) * .06 })).sort((a, b) => b.score - a.score);
  const choice = sorted[0];
  const variants = [0, 1, 2].filter(v => !input.recent.slice(-LIVING_TUNING.recentScenes).includes(`${choice.focus}:${v}`));
  const variant = variants[Math.floor(Math.max(0, Math.min(.99999, input.random)) * variants.length)] ?? 0;
  const isQuiet = ['quiet_floor', 'cushion'].includes(choice.focus), episode = plan(choice.focus, profile, variant, !!hand);
  const evidenceIds = choice.focus === 'user' && hand ? [hand.eventId] : choice.focus === 'cushion' && knownCushion ? [knownCushion.eventId] : [];
  const speak = !isQuiet && variant !== 2;
  return { id: `${choice.focus}:${variant}`, focus: choice.focus, focusPoint: choice.focusPoint, target: choice.target, kind: choice.kind,
    plan: episode, outcome: choice.outcome, reason: `${choice.reason};last=${input.lastOutcome ?? 'none'};active=${input.activeScenes};score=${choice.score.toFixed(2)};recent_focus_penalty`,
    evidenceIds, pauseSeconds: isQuiet ? 9 + variant * 2 : 6 + variant * 2,
    speechBeat: speak ? 'look_back' : undefined, meaning: `living:${choice.focus}`, lines: texts[choice.focus][profile] };
}
