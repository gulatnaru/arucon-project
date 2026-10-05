import type { LifeScene } from './life';

/** Presentation discoveries, never growth costs or rewards. Each row unlocks
 * a normal autonomous/contact response as well as its growth reveal. */
export const LEVEL_EXPRESSIONS = [
  { level: 1, name: '낯선 곳에 눈맞춤', scene: 'look', motion: 'peer', reserved: '여기부터 볼까.', expressive: '여기가 내 방이구나!' },
  { level: 2, name: '귀를 세우고 발끝 톡', scene: 'greeting', motion: 'perk', reserved: '발소리 들었어.', expressive: '오는 소리부터 알겠어!' },
  { level: 3, name: '조심스러운 앞발 인사', scene: 'gesture', motion: 'paw', reserved: '이만큼은 닿네.', expressive: '나도 손 인사!' },
  { level: 4, name: '작게 튀어 자리잡기', scene: 'trick', motion: 'bounce', reserved: '착지는 괜찮았지.', expressive: '통, 딱 섰다!' },
  { level: 5, name: '장난스러운 방향 속임', scene: 'prank', motion: 'feint', reserved: '이쪽인 줄 알았어?', expressive: '왼쪽? 사실 오른쪽!' },
  { level: 6, name: '두 앞발 번갈아 인사', scene: 'gesture', motion: 'alternate', reserved: '이번엔 두 발로.', expressive: '양쪽 다 인사할래!' },
  { level: 7, name: '한 바퀴 살피고 눈맞춤', scene: 'explore', motion: 'turn', reserved: '뒤쪽도 봤어.', expressive: '한 바퀴 돌아왔어!' },
  { level: 8, name: '좌우 빼꼼 확인', scene: 'peek', motion: 'peek', reserved: '둘 다 확인했어.', expressive: '왼쪽 빼꼼, 오른쪽 빼꼼!' },
  { level: 9, name: '몸 털고 태연한 척', scene: 'prank', motion: 'shake', reserved: '아무 일 없었어.', expressive: '털고 나면 멀쩡해!' },
  { level: 10, name: '앞발 쓸어 작은 인사', scene: 'greeting', motion: 'bow', reserved: '내 인사는 이거야.', expressive: '발끝부터 인사할게!' },
  { level: 11, name: '한 발 균형과 복원', scene: 'trick', motion: 'balance', reserved: '흔들려도 다시 서지.', expressive: '한 발로도 씩씩하게!' },
  { level: 12, name: '발맞춤 두 박자', scene: 'trick', motion: 'dance', reserved: '박자는 맞았네.', expressive: '왼발, 오른발, 통!' },
  { level: 13, name: '딴청 부리며 가까이 기대기', scene: 'company', motion: 'lean', reserved: '딴 데 보면서 있어도 돼.', expressive: '살짝 기대도 되지?' },
  { level: 14, name: '빙글 돌다 멈추는 장난', scene: 'prank', motion: 'spin_stop', reserved: '그쪽은 안 갈 건데.', expressive: '빙글, 여기서 멈췄다!' },
  { level: 15, name: '톡톡 두드리고 돌아보기', scene: 'gesture', motion: 'double_tap', reserved: '두 번이면 알겠지.', expressive: '톡톡, 나 좀 봐!' },
  { level: 16, name: '새 모습으로 자리잡기', scene: 'growth', motion: 'new_stance', reserved: '자세가 달라졌네.', expressive: '새 모습으로도 나야!' },
  { level: 17, name: '다가와 인사하고 한 걸음 물러남', scene: 'greeting', motion: 'greet_step', reserved: '먼저 와 봤어.', expressive: '내가 먼저 인사하러 왔어!' },
  { level: 18, name: '귀 기울여 방 끝 살피기', scene: 'explore', motion: 'listen', reserved: '저쪽도 궁금해서.', expressive: '귀 쫑긋, 구경 가자!' },
  { level: 19, name: '두 발로 여유로운 개인기', scene: 'trick', motion: 'flourish', reserved: '이제 편하게 되네.', expressive: '양발 개인기, 보여 줄게!' },
  { level: 20, name: '돌아보고 인사하는 나만의 버릇', scene: 'trick', motion: 'signature', reserved: '이게 내 방식이야.', expressive: '내 인사, 이제 알겠지?' },
] as const satisfies readonly { level: number; name: string; scene: LifeScene; motion: string; reserved: string; expressive: string }[];
export type GrowthMotion = (typeof LEVEL_EXPRESSIONS)[number]['motion'];
export function levelExpression(level: number) {
  return LEVEL_EXPRESSIONS[Math.max(0, Math.min(19, Math.floor(level) - 1))];
}
export function levelRepertoire(level: number): LifeScene[] {
  return [...new Set(LEVEL_EXPRESSIONS.filter(x => x.level <= level).map(x => x.scene))];
}

export type GrowthGesturePose = { x: number; y: number; z: number; yaw: number; tilt: number; pitch: number;
  paw: number; otherPaw: number; squash: number; expression: 'curious' | 'happy' | 'surprised' | 'playful' };
/** Bounded procedural acts on the intact model/attachment hierarchy. No mesh
 * replacement or per-frame content/DB work. Endpoints restore to neutral. */
export function growthGesture(motion: GrowthMotion, progress: number, side: number): GrowthGesturePose {
  const p = Math.max(0, Math.min(1, progress));
  const w = Math.sin(Math.PI * p), twice = Math.sin(Math.PI * 2 * p) * w;
  const pulse = (start: number, end: number) => p <= start || p >= end ? 0 : Math.sin(Math.PI * (p - start) / (end - start));
  const a = pulse(.08, .48), b = pulse(.48, .9);
  const v: GrowthGesturePose = { x: 0, y: 0, z: 0, yaw: 0, tilt: 0, pitch: 0, paw: 0, otherPaw: 0, squash: 0, expression: 'curious' };
  switch (motion) {
    case 'peer': v.yaw = side * .4 * a; v.pitch = .09 * b; v.z = .06 * b; break;
    case 'perk': v.y = .035 * a; v.paw = .1 * b; v.tilt = side * .07 * w; break;
    case 'paw': v.paw = .22 * a; v.tilt = -.1 * b; v.expression = 'happy'; break;
    case 'bounce': v.y = .12 * a; v.squash = .10 * b; v.paw = .06 * a; v.expression = 'surprised'; break;
    case 'feint': v.x = side * .13 * twice; v.yaw = -side * .35 * twice; v.paw = .1 * b; v.expression = 'playful'; break;
    case 'alternate': v.paw = .26 * a; v.otherPaw = .26 * b; v.tilt = .1 * twice; v.expression = 'happy'; break;
    case 'turn': v.yaw = Math.sin(p * Math.PI * 2) * .95 * w; v.pitch = -.08 * b; break;
    case 'peek': v.x = side * .15 * twice; v.tilt = -side * .14 * twice; v.yaw = side * .42 * twice; break;
    case 'shake': v.tilt = Math.sin(p * Math.PI * 6) * .09 * w; v.paw = .07 * b; v.expression = 'playful'; break;
    case 'bow': v.pitch = .17 * a; v.paw = .18 * b; v.z = .08 * a; v.expression = 'happy'; break;
    case 'balance': v.tilt = side * .19 * a; v.otherPaw = .24 * a; v.paw = .08 * b; v.squash = .04 * b; break;
    case 'dance': v.paw = .23 * a; v.otherPaw = .23 * b; v.x = .08 * twice; v.y = .03 * w; v.expression = 'happy'; break;
    case 'lean': v.z = .2 * w; v.tilt = -side * .14 * w; v.yaw = side * .4 * a; v.expression = 'happy'; break;
    case 'spin_stop': v.yaw = side * 1.35 * a; v.tilt = -.08 * b; v.paw = .14 * b; v.expression = 'playful'; break;
    case 'double_tap': v.paw = .2 * (a + b); v.yaw = side * .45 * b; v.expression = 'playful'; break;
    case 'new_stance': v.yaw = side * .6 * twice; v.paw = .15 * a; v.otherPaw = .15 * b; v.squash = .055 * b; v.expression = 'surprised'; break;
    case 'greet_step': v.z = .19 * a - .08 * b; v.paw = .25 * b; v.pitch = .1 * a; v.expression = 'happy'; break;
    case 'listen': v.tilt = side * .13 * a; v.yaw = side * .85 * b; v.pitch = -.07 * b; break;
    case 'flourish': v.paw = .32 * a; v.otherPaw = .28 * b; v.tilt = .15 * twice; v.yaw = .22 * b; v.expression = 'happy'; break;
    case 'signature': v.yaw = side * .8 * a; v.paw = .3 * b; v.otherPaw = .12 * b; v.y = .075 * pulse(.35,.7); v.tilt = -.1 * b; v.expression = 'playful'; break;
  }
  return v;
}
