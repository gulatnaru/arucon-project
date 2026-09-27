import type {
  ReactionCatalog,
  ReactionDefinition,
  ReactionPresentation,
} from './types';

const clip = (
  animation: ReactionPresentation['clip'],
  emotion: ReactionPresentation['emotion'],
  gaze: ReactionPresentation['gaze'],
  minVisibleMs = 700,
): ReactionPresentation => ({
  clip: animation,
  rate: 1,
  emotion,
  gaze,
  minVisibleMs,
});

const repeat = {
  reactionCooldownMs: 12_000,
  familyWindowMs: 90_000,
  maxFamilyInWindow: 2,
} as const;

const line = (id: string, text: string, presentation: ReactionPresentation, nextId?: string) => ({
  id,
  kind: 'line' as const,
  text,
  minReadMs: 1_400,
  presentation,
  ...((nextId ?? (id === 'start' ? 'after' : id === 'after' || id === 'play' || id === 'rest' ? 'end' : undefined)) ? { nextId: nextId ?? (id === 'start' ? 'after' : id === 'after' || id === 'play' || id === 'rest' ? 'end' : undefined) } : {}),
});

const end = { id: 'end', kind: 'end' as const };

const reaction = (definition: ReactionDefinition): ReactionDefinition => definition;

/** Offline scene content. Every choice ends in a concrete follow-up presentation. */
const BASE_CATALOG: ReactionDefinition[] = [
  reaction({
    id: 'petting_reserved_head', family: 'petting', priority: 80,
    conditions: { triggers: ['petting'], personalities: ['reserved'], touchTargets: ['head', 'unknown'] },
    presentation: clip('pet_reserved', 'shy', 'aside'), repeat,
    dialogue: { startId: 'start', nodes: [line('start', '……거긴 괜찮네.', clip('pet_reserved', 'shy', 'aside')), line('after', '손이 따뜻했어.', clip('idle_reserved', 'content', 'user')), end] },
  }),
  reaction({
    id: 'petting_reserved_body', family: 'petting', priority: 75,
    conditions: { triggers: ['petting'], personalities: ['reserved'], touchTargets: ['body'] },
    presentation: clip('pet_reserved', 'content', 'aside'), repeat,
    dialogue: { startId: 'start', nodes: [line('start', '……조금만 더.', clip('pet_reserved', 'content', 'aside')), line('after', '옆에 있을게.', clip('quiet_approach', 'content', 'user')), end] },
  }),
  reaction({
    id: 'petting_expressive', family: 'petting', priority: 80,
    conditions: { triggers: ['petting'], personalities: ['expressive'] },
    presentation: clip('pet_expressive', 'content', 'user'), repeat,
    dialogue: { startId: 'start', nodes: [line('start', '응, 여기 좋아!', clip('pet_expressive', 'content', 'user')), line('after', '한 번 더 기대도 돼?', clip('honest_touch', 'content', 'user')), end] },
  }),
  reaction({
    id: 'ball_reserved', family: 'ball', priority: 70,
    conditions: { triggers: ['ball'], personalities: ['reserved'], requireAffordances: ['ball'] },
    presentation: clip('tsundere_ball', 'interested', 'object'), repeat,
    dialogue: { startId: 'start', nodes: [line('start', '그냥 여기 둔 거야.', clip('tsundere_ball', 'shy', 'aside'), 'choice'), { id: 'choice', kind: 'choice', prompt: '같이 놀까?', choices: [{ id: 'play', label: '같이 놀기', nextId: 'play' }, { id: 'rest', label: '옆에서 쉬기', nextId: 'rest' }], timeoutMs: null }, line('play', '한 번만이야.', clip('tsundere_ball', 'interested', 'object')), line('rest', '……그것도 나쁘진 않네.', clip('idle_reserved', 'content', 'rest')), end] },
  }),
  reaction({
    id: 'ball_expressive', family: 'ball', priority: 70,
    conditions: { triggers: ['ball'], personalities: ['expressive'], requireAffordances: ['ball'] },
    presentation: clip('honest_ball', 'interested', 'user'), repeat,
    dialogue: { startId: 'start', nodes: [line('start', '공 왔다! 같이 하자!', clip('honest_ball', 'interested', 'user')), line('after', '내가 먼저 가져올게!', clip('honest_ball', 'content', 'object')), end] },
  }),
  reaction({
    id: 'rest_reserved', family: 'rest', priority: 55,
    conditions: { triggers: ['rest'], personalities: ['reserved'], sleeping: false, hibernating: false },
    presentation: clip('idle_reserved', 'sleepy', 'rest'), repeat,
    dialogue: { startId: 'start', nodes: [line('start', '조용해서 좋아.', clip('idle_reserved', 'sleepy', 'rest')), line('after', '옆에 앉아도 돼.', clip('quiet_approach', 'content', 'user')), end] },
  }),
  reaction({
    id: 'rest_expressive', family: 'rest', priority: 55,
    conditions: { triggers: ['rest'], personalities: ['expressive'], sleeping: false, hibernating: false },
    presentation: clip('idle_expressive', 'content', 'rest'), repeat,
    dialogue: { startId: 'start', nodes: [line('start', '잠깐 같이 쉬자!', clip('idle_expressive', 'content', 'user')), line('after', '여기 기대 있을게.', clip('honest_touch', 'content', 'user')), end] },
  }),
  reaction({ id: 'greeting_reserved', family: 'greeting', priority: 60, conditions: { triggers: ['greeting'], personalities: ['reserved'] }, presentation: clip('tsundere_greet', 'shy', 'aside'), repeat, dialogue: { startId: 'start', nodes: [line('start', '왔네…….', clip('tsundere_greet', 'shy', 'aside')), line('after', '잠깐 봐줄게.', clip('quiet_approach', 'content', 'user')), end] } }),
  reaction({ id: 'greeting_expressive', family: 'greeting', priority: 60, conditions: { triggers: ['greeting'], personalities: ['expressive'] }, presentation: clip('honest_greet', 'content', 'user'), repeat, dialogue: { startId: 'start', nodes: [line('start', '왔구나! 반가워!', clip('honest_greet', 'content', 'user')), line('after', '먼저 가까이 갈게!', clip('quiet_approach', 'content', 'user')), end] } }),
  reaction({ id: 'meal_committed', family: 'meal', priority: 100, conditions: { triggers: ['meal_committed'], evidenceKinds: ['committed_meal'] }, presentation: clip('eat', 'content', 'object'), repeat, dialogue: { startId: 'start', nodes: [line('start', '잘 먹었어.', clip('eat', 'content', 'object')), line('after', '배가 따뜻해졌어.', clip('idle_expressive', 'content', 'user')), end] } }),
  reaction({ id: 'rest_sleeping_quiet', family: 'rest.sleeping', priority: 100, conditions: { triggers: ['rest'], sleeping: true, hibernating: false }, presentation: clip('sleep', 'sleepy', 'rest', 900), repeat }),
  reaction({ id: 'sleep', family: 'sleep', priority: 100, conditions: { triggers: ['sleep'], sleeping: true, hibernating: false }, presentation: clip('sleep', 'sleepy', 'rest'), repeat, dialogue: { startId: 'start', nodes: [line('start', '잘 자…….', clip('sleep', 'sleepy', 'rest'), 'end'), end] } }),
  reaction({ id: 'wake', family: 'wake', priority: 100, conditions: { triggers: ['wake'], sleeping: false, hibernating: false }, presentation: clip('wake', 'content', 'user'), repeat, dialogue: { startId: 'start', nodes: [line('start', '좋은 아침!', clip('wake', 'content', 'user'), 'end'), end] } }),
  reaction({ id: 'furniture', family: 'furniture', priority: 50, conditions: { triggers: ['furniture'], requireAffordances: ['cushion', 'table'] }, presentation: clip('quiet_approach', 'interested', 'object'), repeat, dialogue: { startId: 'start', nodes: [line('start', '여기 앉아볼래.', clip('quiet_approach', 'interested', 'object')), line('after', '자리 괜찮다.', clip('idle_expressive', 'content', 'rest')), end] } }),
  reaction({ id: 'growth_reserved', family: 'growth.reserved', priority: 110, conditions: { triggers: ['growth_committed'], personalities: ['reserved'], minGrowthStage: 2, sources: ['live'], evidenceKinds: ['committed_growth'] }, presentation: clip('tsundere_greet', 'surprised', 'aside'), repeat, dialogue: { startId: 'start', nodes: [line('start', '……조금 달라졌나 봐.', clip('tsundere_greet', 'surprised', 'aside')), line('after', '새 자세도 보여줄게.', clip('idle_reserved', 'content', 'user')), end] } }),
  reaction({ id: 'growth_expressive', family: 'growth.expressive', priority: 110, conditions: { triggers: ['growth_committed'], personalities: ['expressive'], minGrowthStage: 2, sources: ['live'], evidenceKinds: ['committed_growth'] }, presentation: clip('honest_greet', 'surprised', 'user'), repeat, dialogue: { startId: 'start', nodes: [line('start', '어? 조금 달라졌어!', clip('honest_greet', 'surprised', 'user')), line('after', '새로운 자세를 보여줄게!', clip('idle_expressive', 'content', 'user')), end] } }),
  reaction({ id: 'growth_fixture_reserved', family: 'growth.fixture_reserved', priority: 105, conditions: { triggers: ['growth_committed'], personalities: ['reserved'], minGrowthStage: 2, sources: ['fixture'], evidenceKinds: ['synthetic_growth_fixture'] }, presentation: clip('tsundere_greet', 'surprised', 'aside'), repeat, dialogue: { startId: 'start', nodes: [line('start', '합성 비교에서 새 자세가 열렸어.', clip('tsundere_greet', 'surprised', 'aside')), line('after', '실제 성장 기록과는 따로 볼게.', clip('idle_reserved', 'content', 'user')), end] } }),
  reaction({ id: 'growth_fixture_expressive', family: 'growth.fixture_expressive', priority: 105, conditions: { triggers: ['growth_committed'], personalities: ['expressive'], minGrowthStage: 2, sources: ['fixture'], evidenceKinds: ['synthetic_growth_fixture'] }, presentation: clip('honest_greet', 'surprised', 'user'), repeat, dialogue: { startId: 'start', nodes: [line('start', '합성 비교에서 새 자세를 발견했어!', clip('honest_greet', 'surprised', 'user')), line('after', '실제 성장 기록과는 따로 보여줄게.', clip('idle_expressive', 'content', 'user')), end] } }),
  reaction({ id: 'cleaned', family: 'clean.cleaned', priority: 90, conditions: { triggers: ['clean'], evidenceKinds: ['clean_result'], cleanResults: ['cleaned'] }, presentation: clip('idle_expressive', 'content', 'object'), repeat, dialogue: { startId: 'start', nodes: [line('start', '깨끗해졌네.', clip('idle_expressive', 'content', 'object'), 'end'), end] } }),
  reaction({ id: 'clean_noop', family: 'clean.noop', priority: 90, conditions: { triggers: ['clean'], evidenceKinds: ['clean_result'], cleanResults: ['nothing_to_clean'] }, presentation: clip('idle_reserved', 'neutral', 'object'), repeat, dialogue: { startId: 'start', nodes: [line('start', '지금도 깨끗해.', clip('idle_reserved', 'neutral', 'object'), 'end'), end] } }),
  reaction({ id: 'clean_auto_toilet', family: 'clean.auto_toilet', priority: 90, conditions: { triggers: ['clean'], evidenceKinds: ['clean_result'], cleanResults: ['auto_toilet'] }, presentation: clip('idle_reserved', 'content', 'object'), repeat, dialogue: { startId: 'start', nodes: [line('start', '자동으로 정돈됐어.', clip('idle_reserved', 'content', 'object'), 'end'), end] } }),
];

// Same input/personality has a second semantic scene path, so family suppression
// can rotate gestures rather than merely rotate synonymous lines.
const ALTERNATIVE_SCENES: ReactionDefinition[] = [
  { ...BASE_CATALOG.find((r) => r.id === 'petting_reserved_head')!, id: 'petting_reserved_hand_gaze', family: 'petting.hand_gaze', presentation: clip('tsundere_touch', 'shy', 'down'), dialogue: { startId: 'start', nodes: [line('start', '손이 있던 곳을 볼게.', clip('tsundere_touch', 'shy', 'down'), 'end'), end] } },
  { ...BASE_CATALOG.find((r) => r.id === 'petting_expressive')!, id: 'petting_expressive_approach', family: 'petting.approach', presentation: clip('quiet_approach', 'content', 'user'), dialogue: { startId: 'start', nodes: [line('start', '내가 먼저 다가갈게!', clip('quiet_approach', 'content', 'user'), 'end'), end] } },
  { ...BASE_CATALOG.find((r) => r.id === 'rest_reserved')!, id: 'rest_reserved_silent_approach', family: 'rest.silent_approach', presentation: clip('quiet_approach', 'content', 'rest'), dialogue: { startId: 'start', nodes: [line('start', '말없이 가까이 앉을게.', clip('quiet_approach', 'content', 'rest'), 'end'), end] } },
  { ...BASE_CATALOG.find((r) => r.id === 'rest_expressive')!, id: 'rest_expressive_invitation', family: 'rest.invitation', presentation: clip('honest_touch', 'content', 'user'), dialogue: { startId: 'start', nodes: [line('start', '이쪽에서 같이 쉬자!', clip('honest_touch', 'content', 'user'), 'end'), end] } },
  { ...BASE_CATALOG.find((r) => r.id === 'greeting_reserved')!, id: 'greeting_reserved_aside_wave', family: 'greeting.aside_wave', presentation: clip('tsundere_touch', 'shy', 'aside'), dialogue: { startId: 'start', nodes: [line('start', '……손만 흔들게.', clip('tsundere_touch', 'shy', 'aside'), 'end'), end] } },
  { ...BASE_CATALOG.find((r) => r.id === 'greeting_expressive')!, id: 'greeting_expressive_approach', family: 'greeting.approach', presentation: clip('quiet_approach', 'content', 'user'), dialogue: { startId: 'start', nodes: [line('start', '먼저 가까이 갈게!', clip('quiet_approach', 'content', 'user'), 'end'), end] } },
];

export const REACTION_CATALOG: ReactionCatalog = [...BASE_CATALOG, ...ALTERNATIVE_SCENES];

export default REACTION_CATALOG;
