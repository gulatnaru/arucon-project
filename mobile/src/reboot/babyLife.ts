import type { BabyExpression, RebootIntent, TouchRegion } from './contracts';
import type { FloorPoint } from '../scene/types';

export const BABY_SIZE_CANDIDATES = [1.15, 1.25, 1.35] as const;
export const BABY_SIZE_APPROVAL = { finalSize: null, status: 'USER_REVIEW_PENDING' } as const;
export type BabyBeat = Readonly<{ id: string; seconds: number; expression: BabyExpression }>;
export type BabyPlan = Readonly<{ beats: readonly BabyBeat[]; touchStyle?: string; rememberedHandId?: string }>;
const beat = (id: string, seconds: number, expression: BabyExpression): BabyBeat => ({ id, seconds, expression });
export const BABY_AUTONOMOUS = ['baby_scout', 'baby_discover', 'baby_sneak', 'baby_silly', 'baby_peek', 'rest'] as const;

export function babyTarget(kind: RebootIntent, cushion: FloorPoint, random: () => number): FloorPoint {
  if (kind === 'rest') return cushion;
  if (kind === 'baby_peek') return { x: .45, z: 2.8 };
  if (kind === 'baby_scout') return { x: cushion.x + (cushion.x >= 0 ? -.95 : .95), z: cushion.z + .1 };
  if (kind === 'baby_discover') return { x: random() * .8 - .4, z: -2.7 };
  // Observe the plant from a clear side: the toilet at(-1.95,-1.62)
  // occluded the actor and face from the unchanged portrait camera at x=-1.9.
  if (kind === 'baby_sneak') return { x: -.90, z: -2.65 };
  return { x: random() * 2.6 - 1.3, z: random() * 2.0 + .45 };
}

/** Short causal episodes. Domain clocks, rewards, personality IDs never enter here. */
export function babyPlan(kind: RebootIntent, region: TouchRegion = 'unknown', repeated = false, interrupted?: RebootIntent, handId?: string, burst = 1, recentStyles: readonly string[] = []): BabyPlan {
  if (kind === 'hand') {
    const startled = interrupted === 'baby_sneak' || interrupted === 'baby_discover';
    let style = repeated ? burst === 1 ? 'tickle' : burst % 2 === 0 ? 'side_nuzzle' : 'paw_offer'
      : region === 'head' ? 'head_lean' : startled ? 'startle_then_lean' : handId ? 'familiar_nuzzle' : 'body_wiggle';
    if (repeated && burst >= 4) {
      const available = ['tickle', 'side_nuzzle', 'paw_offer', region === 'head' ? 'head_lean' : 'body_wiggle', handId ? 'familiar_nuzzle' : 'lean']
        .filter(candidate => !recentStyles.slice(-2).includes(candidate));
      let score = burst * 2654435761;
      for (const c of region + (interrupted ?? '') + (handId ?? '')) score = Math.imul(score ^ c.charCodeAt(0), 16777619);
      style = available[(score >>> 0) % available.length] ?? (region === 'head' ? 'head_lean' : 'body_wiggle');
    }
    const expression = style === 'paw_offer' ? 'curious' : style === 'side_nuzzle' ? 'content' : repeated ? 'playful' : startled ? 'surprised' : region === 'head' ? 'content' : 'excited';
    return { touchStyle: style, rememberedHandId: handId, beats: [beat(style, 2.4, expression)] };
  }
  if (kind === 'hat_first') return { beats: [beat('hat_look_up', .9, 'curious'), beat('hat_test_step', 1.1, 'surprised'), beat('hat_shake', .85, 'embarrassed'), beat('hat_show', .95, 'excited')] };
  if (kind === 'hat_again') return { beats: [beat('hat_recognize', .55, 'playful'), beat('hat_adjust', .6, 'content'), beat('hat_show', .55, 'excited')] };
  if (kind === 'hat_busy') return { beats: [beat('hat_quick_check', .45, 'curious'), beat('hat_adjust', .65, 'playful')] };
  if (kind === 'rest' || kind === 'cushion_changed') return { beats: [beat('cushion_knead', .9, 'curious'), beat('yawn', .9, 'sleepy'), beat('cushion_sink', 2.2, 'content'), beat('look_back', 1, 'content')] };
  if (kind === 'baby_scout') return { beats: [beat('scan', 1, 'curious'), beat('too_close', .7, 'surprised'), beat('shake', .9, 'embarrassed'), beat('look_back', 1.2, 'content')] };
  if (kind === 'baby_discover') return { beats: [beat('sniff', .9, 'curious'), beat('tiny_hops', .95, 'excited'), beat('too_close', .65, 'surprised'), beat('shake', .75, 'embarrassed'), beat('look_back', 1.2, 'playful')] };
  if (kind === 'baby_sneak') return { beats: [beat('peek', 1.0, 'curious'), beat('sneak', 1.1, 'playful'), beat('tiny_hops', .85, 'excited'), beat('look_back', 1.1, 'content')] };
  if (kind === 'baby_silly') return { beats: [beat('paw_flick', .85, 'playful'), beat('oops', .8, 'embarrassed'), beat('shake', .7, 'surprised'), beat('tiny_hops', .8, 'excited'), beat('look_back', 1.1, 'content')] };
  return { beats: [beat('peek', .9, 'curious'), beat('lean', 1.1, 'content'), beat('tiny_hops', .9, 'excited'), beat('look_back', 1.0, 'playful')] };
}

export function currentBabyBeat(plan: BabyPlan, elapsed: number): { beat: BabyBeat; index: number; progress: number } {
  let time = Math.max(0, elapsed);
  for (let index = 0; index < plan.beats.length; index++) {
    const beat = plan.beats[index];
    if (time < beat.seconds || index === plan.beats.length - 1) return { beat, index, progress: Math.min(1, time / beat.seconds) };
    time -= beat.seconds;
  }
  throw new Error('A baby episode needs at least one beat');
}

const lines: Record<string, readonly string[]> = {
  sniff: ['저건 뭐지?', '조금만 가까이.', '여기, 궁금해.', '한 번 볼까?'],
  scan: ['어, 저쪽!', '뭐가 있네?', '살짝 보고 올게.', '잠깐 구경할래.'],
  too_close: ['앗!', '생각보다 가깝네.', '어라?', '깜짝이야.'],
  tiny_hops: ['히히!', '이쪽도 볼래!', '한 번 더!', '통통!'],
  paw_flick: ['요렇게!', '잡을 뻔했어.', '발이 먼저 갔네.', '조금만 장난칠래.'],
  oops: ['못 본 걸로!', '아무 일도 없어.', '다시 해 볼까?', '발이 헛갔네.'],
  peek: ['여기 있었네!', '살짝 봤어.', '뭐 하고 있어?', '나도 가까이 갈래.'],
  sneak: ['몰래 살짝.', '조용히, 조용히.', '어디로 갈까?', '발끝으로!'],
  look_back: ['나 봤어?', '여기도 좋네.', '이제 알겠어.', '다른 데도 볼래.'],
  yawn: ['하아암.', '잠깐 폭신하게.', '조금만 쉬자.', '여기 편해.'],
  head_lean: ['거기, 좋아.', '손이 폭신해.', '조금 더 가까이.', '머리가 간질간질.'],
  body_wiggle: ['간질간질!', '몸이 먼저 움직여.', '손 따라 갈래.', '히히, 여기!'],
  tickle: ['또 간지러워!', '이번엔 이쪽!', '꼼지락, 꼼지락.', '나도 움직일래.'],
  side_nuzzle: ['이쪽도 기대 볼래.', '몸을 바꿔 봤어.', '이번엔 살짝.', '옆으로 폭신하게.'],
  paw_offer: ['내 발도 볼래?', '이렇게 해 볼까?', '나도 손 내밀게.', '이번엔 내가 먼저!'],
  startle_then_lean: ['앗, 네 손이구나.', '구경하다 놀랐네.', '여기 기대도 돼?', '이제 가까이 갈래.'],
  familiar_nuzzle: ['아까 그 손!', '여기 또 기대 볼래.', '이번엔 먼저 갈래.', '그 느낌, 알아.'],
  hat_look_up: ['머리에 뭐가 왔네?', '살짝 움직여 볼까?', '이건 처음 보네.', '위에 궁금한 게 있어.'],
  hat_recognize: ['아, 이 모자!', '이번엔 바로 쓸래.', '이제 잘 맞네.', '전에 써 봤지!'],
  hat_show: ['잘 썼지?', '한 번 움직여 봤어.', '히히, 이대로 갈래.', '나 좀 봐!'],
  hat_quick_check: ['잠깐 쓰고 갈게.', '구경하던 데로!', '금방 확인했어.', '이번엔 빨리!'],
  cushion_knead: ['폭신한지 볼래.', '여기 눌러 봤어.', '발이 쏙 들어가.', '여기 자리 잡을래.'],
  cushion_changed: ['어, 저기였는데!', '이쪽으로 왔네.', '새 자리도 볼래.', '다시 찾아왔어.'],
};

/** Display history is separate from completion memory; never runs per frame. */
export class BabyLines {
  private recent: string[] = [];
  private lastAutoAt = -Infinity;
  private lastToken = '';
  private lastSpokenAt = -Infinity;
  select(key: string, token: string, automatic: boolean, atMs: number): { lineId: string; text: string } | null {
    const choices = lines[key];
    if (!choices || automatic && atMs - this.lastAutoAt < 9_000 || !automatic && token === this.lastToken && atMs - this.lastSpokenAt < 2_300) return null;
    const fresh = choices.map((text, i) => ({ text, lineId: key + ':' + i })).filter(x => !this.recent.slice(-3).includes(x.lineId));
    if (!fresh.length) return null;
    let hash = 2166136261; for (const c of token + key) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
    const selected = fresh[(hash >>> 0) % fresh.length]; this.recent.push(selected.lineId); this.recent = this.recent.slice(-12);
    if (automatic) this.lastAutoAt = atMs;
    this.lastToken = token; this.lastSpokenAt = atMs;
    return selected;
  }
}
