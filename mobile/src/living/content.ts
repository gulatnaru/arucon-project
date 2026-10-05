import type { LifeScene } from './life';
import { LIFE } from './life';
import { levelExpression } from './levelExpressions';

type Lines = Readonly<{ reserved: readonly string[]; expressive: readonly string[] }>;
export type MealAvailability = 'ready' | 'no_food' | 'no_table' | 'manual';
const HUNGER_LINES: Record<MealAvailability, Lines> = {
  ready: { reserved: ['그릇 쪽에 가 볼까.', '조금 먹어도 되겠네.'], expressive: ['밥 먹으러 갈래.', '그릇 앞에 앉아야지.'] },
  no_food: { reserved: ['먹이는 준비되면 먹을게.', '지금은 먹이가 없네.'], expressive: ['먹이가 생기면 먹자.', '밥은 준비되면 먹을게.'] },
  no_table: { reserved: ['여기서 한 입 먹을까?', '그릇 대신 여기서 먹어도 돼.'], expressive: ['손으로 한 입 줄래?', '여기 앉아서 먹을래.'] },
  manual: { reserved: ['밥 먹을까?', '그릇 앞에서 잠깐 쉴게.'], expressive: ['한 입 먹고 싶어.', '밥 주면 여기서 먹을게.'] },
};
/** Each category is reached from a performed living intent, never a diagnostic-only line picker. */
export const LIFE_LINES: Readonly<Record<LifeScene, Lines>> = {
  explore: { reserved: ['먼저 저쪽부터.', '이 자리에선 다르게 보이네.', '돌아오는 길도 알아.', '조용히 구경 좀 하고.'], expressive: ['방 끝까지 가 볼래!', '여기서 보니 새롭다!', '한 바퀴 둘러보고 왔어.', '저쪽이 궁금했어!'] },
  prank: { reserved: ['바로 그쪽으로 갈 줄 알았지?', '딴청은 잠깐이야.', '못 본 척해도 돼.', '이번에는 살짝 바꿔 봤어.'], expressive: ['깜짝, 방향 바꿨다!', '앗, 내가 먼저 장난쳤네!', '이번에는 이쪽이지!', '살짝 속여 봤어!'] },
  trick: { reserved: ['이건 내가 해 볼게.', '연습한 건 아니고.', '보고 있었네.', '한 번쯤 보여 줄 수 있지.'], expressive: ['내 개인기 볼래?', '이번엔 내가 먼저!', '나 혼자서도 해 봤어.', '아까보다 편해졌어!'] },
  hungry: { reserved: ['그릇 쪽에 가 볼까.', '조금 먹어도 되겠네.'], expressive: ['간식 먹고 싶어.', '그릇 앞에서 기다릴게.'] },
  seat: { reserved: ['오늘은 이쪽.', '자리 한번 바꿔 볼까.'], expressive: ['여기도 편하네!', '다른 자리에 앉아 볼래.'] },
  solo: { reserved: ['어디까지 가나 보자.', '공이 자꾸 도망가네.'], expressive: ['데굴데굴, 따라간다!', '앗, 저쪽으로 갔네!'] },
  greeting: { reserved: ['왔네.', '여기 앉아도 돼.', '자리 비워 뒀어.', '마침 깨어 있었어.'], expressive: ['안녕! 같이 있자.', '어서 와, 여기야!', '오늘은 뭐 할까?', '얼굴 보니까 좋다.'] },
  touch: { reserved: ['거기. 조금만.', '손 따뜻하네.', '이쪽도 괜찮아.', '잠깐 기대 있을게.'], expressive: ['아, 시원해!', '조금 더 해 줄래?', '여기도 부탁해!', '손에 쏙 기대야지.'] },
  release: { reserved: ['잘 쉬었다.', '이제 움직여 볼까.', '손에 털 묻었겠다.', '다음엔 내가 다가갈게.'], expressive: ['기분 좋아졌어!', '고마워, 이제 놀자.', '몸이 사르르 풀렸어.', '다음에도 해 줘!'] },
  ball: { reserved: ['이번엔 저쪽.', '잠깐. 내 차례.', '받아 봐.', '꽤 멀리 갔네.'], expressive: ['내가 가져올게!', '자, 다시 간다!', '데굴데굴, 받아!', '이번엔 크게 굴려 볼까?'] },
  offer: { reserved: ['이거, 굴러왔네.', '공이 여기 있었어.', '한 번만 굴려 볼래?', '이쪽은 비어 있네.'], expressive: ['공놀이하자!', '너한테 보내 줄게!', '같이 굴려 볼래?', '여기서 기다릴게.'] },
  peek: { reserved: ['거기 있는 거 알아.', '이번엔 반대였네.', '깜짝이야. 조금.', '내가 먼저 봤어.'], expressive: ['찾았다!', '앗! 거기였구나.', '이번엔 어디일까?', '나도 빼꼼!'] },
  gesture: { reserved: ['이렇게?', '발은 여기까지만.', '생각보다 쉽네.', '고개만 살짝.'], expressive: ['짝! 잘 맞았다.', '나도 따라 할래!', '이쪽으로 기울이면 돼?', '한 번 더 보여 줘!'] },
  meal: { reserved: ['천천히 먹을게.', '마지막 한 입.', '입에 묻었나?', '잘 먹었어.'], expressive: ['맛있다!', '냠, 고마워!', '배가 든든해.', '입까지 깨끗하게!'] },
  rest: { reserved: ['그럼 잠깐만.', '여기가 더 폭신해.', '이 자리 괜찮다.', '옆은 비워 둘게.'], expressive: ['같이 쉬자!', '푹신해서 좋아.', '여기 기대 봐.', '잠깐 몸을 묻어야지.'] },
  toilet: { reserved: ['잠깐 다녀올게.', '이제 됐어.', '몸 좀 정돈하고.', '다시 놀던 데로 갈까.'], expressive: ['다녀올게!', '아, 개운해.', '이제 나왔어!', '기지개 한 번!'] },
  look: { reserved: ['저 잎, 삐뚤어졌네.', '창 쪽이 환하네.', '저쪽도 좀 볼까.', '아까랑 다른 자리네.'], expressive: ['방을 둘러볼까?', '창문 쪽이 예쁘다.', '저 잎도 구경할래.', '여긴 어떤 느낌일까?'] },
  company: { reserved: ['그냥 여기 있을게.', '이쪽이 편해서.', '자리 조금만 빌릴게.', '말 안 해도 괜찮아.'], expressive: ['네 옆이 좋아.', '나도 여기 앉을래.', '같이 바라보자.', '잠깐 나란히 있자.'] },
  growth: { reserved: ['이 자세도 되네.', '전보다 편해졌어.', '방금 봤어?', '조금 달라진 것 같아.'], expressive: ['새 자세를 해 봤어!', '어제보다 든든해!', '이것도 할 수 있네!', '나 좀 봐, 달라졌지?'] },
  stretch: { reserved: ['쭉 펴 볼까.', '몸 좀 풀고.'], expressive: ['쭈욱, 기지개!', '발끝까지 늘려야지.'] },
  inspect: { reserved: ['어디로 굴러가나.', '살짝만 건드려 볼까.'], expressive: ['톡, 움직였다!', '공을 살펴볼래.'] },
  drowsy: { reserved: ['눈만 잠깐 감을게.', '조용해서 좋네.'], expressive: ['눈이 스르르 감겨.', '포근한 시간이다.'] },
  mishap: { reserved: ['못 본 걸로 해.', '원래 이렇게 하려던 거야.'], expressive: ['앗, 빗나갔다!', '한 바퀴 헛돌았네.'] },
};
export type LifeMemory = { schemaVersion: 1; petId: string; shown: { id: string; atMs: number }[];
  completed: { scene: LifeScene; atMs: number }[]; lastAutomaticAtMs: number };
export const emptyLifeMemory = (petId: string): LifeMemory => ({ schemaVersion: 1, petId, shown: [], completed: [], lastAutomaticAtMs: 0 });

export function chooseLifeLine(memory: LifeMemory, scene: LifeScene, personality: 'reserved' | 'expressive', atMs: number,
  automatic: boolean, random = Math.random, catalog = LIFE_LINES, need?: MealAvailability,
  context?: { level: number; motionLevel?: number; previousScene?: LifeScene; touchTarget?: 'head' | 'body' | 'unknown' }): { text: string; id: string; eligible: string[]; excludedRecent: string[] } | null {
  if (automatic && atMs >= memory.lastAutomaticAtMs && atMs - memory.lastAutomaticAtMs < LIFE.speechGapMs) return null;
  // Quiet observation deliberately includes wordless stretches, looks and pauses.
  if (automatic && scene !== 'offer' && scene !== 'hungry' && random() < .65) return null;
  const lines = scene === 'hungry' && need ? HUNGER_LINES[need] : catalog[scene];
  const candidates = lines[personality].map((text, index) => ({ text, id: `${scene}:${scene === 'hungry' && need ? `${need}:` : ''}${personality}:${index}` }));
  if (context) {
    const beat = levelExpression(context.motionLevel ?? context.level);
    if (scene === 'growth') candidates.splice(0, candidates.length, { text: beat[personality], id: `growth:${personality}:level${beat.level}` });
    else if (scene === beat.scene || scene === 'trick' || scene === 'prank') candidates.push({ text: beat[personality], id: `${scene}:${personality}:level${beat.level}` });
    if (scene === 'touch') {
      const body = context.touchTarget === 'body';
      const growing = context.level >= 6;
      const specific = personality === 'reserved' ? body ? ['그쪽으로 기대 볼게.', '등은 거기. 천천히.', '몸이 먼저 기울었네.', growing ? '내가 손 쪽으로 갈게.' : '어디까지 눌리나 보자.']
        : ['고개는 조금만.', '귀 옆이 편하네.', '눈 감고 있어도 돼?', growing ? '인사는 발로 할게.' : '손 높이가 익숙해지네.']
        : body ? ['등이 사르르 풀려!', '옆으로 기대 볼게!', '여기, 몸이 쏙 눌린다.', growing ? '손 쪽으로 내가 갈래!' : '조금만 기대 있어도 돼?']
          : ['머리 쓰다듬어 줘서 좋아!', '귀 옆도 부탁해!', '눈 감고 느껴 볼게.', growing ? '앞발도 인사할게!' : '손이 얼마나 따뜻한지 알겠어!'];
      candidates.push(...specific.map((text, index) => ({ text, id: `touch:${personality}:${body ? 'body' : 'head'}:${growing ? 'grown' : 'baby'}:${index}` })));
      if (context.previousScene && ['ball', 'solo', 'prank', 'trick', 'explore'].includes(context.previousScene)) candidates.push({
        text: personality === 'reserved' ? '잠깐만. 놀던 데로 갈게.' : '쉬고 나서 하던 거 또 할래!', id: `touch:${personality}:after:${context.previousScene}`,
      });
      if (memory.completed.some(x => x.scene === 'ball' && atMs - x.atMs >= 0 && atMs - x.atMs < 3_600_000)) candidates.push({ text: personality === 'reserved' ? '공은 잠깐 옆에 뒀어.' : '공놀이하고 쉬는 손길이 좋아!', id: `touch:${personality}:recent_ball` });
    }
  }
  if (scene === 'offer' && memory.completed.some(x => x.scene === 'ball' && atMs >= x.atMs && atMs - x.atMs < 3_600_000)) {
    candidates.push({ text: personality === 'reserved' ? '아까 그거, 한 번 더?' : '아까 공놀이 또 하자!', id: `offer:${personality}:remember` });
  }
  const excludedCount = Math.min(3, candidates.length - 1);
  const recent = excludedCount > 0 ? memory.shown.filter(x => x.id.startsWith(`${scene}:`)).slice(-excludedCount).map(x => x.id) : [];
  const fresh = candidates.filter(x => !recent.includes(x.id));
  const uses = (id: string) => memory.shown.filter(x => x.id === id).length;
  const minimumUses = Math.min(...fresh.map(x => uses(x.id)));
  const varied = fresh.filter(x => uses(x.id) === minimumUses);
  const chosen = varied[Math.min(varied.length - 1, Math.floor(random() * varied.length))];
  if (!chosen) return null;
  memory.shown = [...memory.shown, { id: chosen.id, atMs }].slice(-48);
  if (automatic) memory.lastAutomaticAtMs = atMs;
  return { ...chosen, eligible: fresh.map(x => x.id), excludedRecent: recent };
}

export const LIFE_SCENE_NAMES: Record<LifeScene, string> = { explore: '방 끝 탐색', prank: '방향 장난', trick: '먼저 보여준 개인기', greeting: '눈맞춤 인사', look: '방 구경', stretch: '기지개', inspect: '공 살펴보기',
  offer: '먼저 공을 건넨 날', ball: '공 주고받기', peek: '손가락 까꿍', gesture: '앞발 인사', rest: '쿠션에 푹', drowsy: '꾸벅꾸벅',
  meal: '맛있는 식사', toilet: '화장실 다녀오기', company: '곁에 앉기', mishap: '작은 헛발질', growth: '새 자세 발견', touch: '손에 기대기',
  release: '몸 정돈하기', hungry: '식사 기다리기', seat: '자리 고르기', solo: '혼자 공 따라가기' };

export function rememberLifeCompletion(memory: LifeMemory, scene: LifeScene, atMs: number) {
  const previous = memory.completed.at(-1);
  // Held/repeated input never instantly establishes a preference.
  if (previous && previous.scene === scene && atMs - previous.atMs < 30_000) return;
  memory.completed = [...memory.completed, { scene, atMs }].slice(-32);
}

/** Weak and reversible: varied completed experiences, never rapid-click farming. */
export function lifePreference(memory: LifeMemory): LifeScene | undefined {
  if (memory.completed.length < 6 || new Set(memory.completed.map(x => x.scene)).size < 3) return;
  const counts = new Map<LifeScene, number>();
  for (const row of memory.completed) counts.set(row.scene, (counts.get(row.scene) ?? 0) + 1);
  return [...counts].filter(([scene, count]) => ['ball', 'rest', 'peek', 'gesture', 'company'].includes(scene) && count >= 3)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
}
