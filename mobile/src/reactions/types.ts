export const REACTION_CLIPS = [
  'idle_reserved', 'idle_expressive', 'walk', 'pet_reserved', 'pet_expressive',
  'quiet_approach', 'eat', 'sleep', 'wake', 'tsundere_greet', 'tsundere_touch',
  'tsundere_ball', 'honest_greet', 'honest_touch', 'honest_ball',
] as const;

export type ReactionClip = typeof REACTION_CLIPS[number];
export type PersonalityStyle = 'reserved' | 'expressive';
export type ReactionTrigger =
  | 'petting' | 'ball' | 'rest' | 'greeting' | 'meal_committed'
  | 'sleep' | 'wake' | 'furniture' | 'growth_committed' | 'clean';
export type ReactionFamily = string;
export type ReactionAffordance = 'ball' | 'cushion' | 'table' | 'toilet';
export type MomentEmotion = 'neutral' | 'interested' | 'content' | 'surprised' | 'shy' | 'sleepy';
export type GazeDirection = 'user' | 'aside' | 'object' | 'down' | 'rest';
export type ReactionSource = 'live' | 'fixture';

export type GrowthProjection = import('../progression/projection').GrowthProjection;

export type ReactionEvidence =
  | Readonly<{
      kind: 'committed_growth'; eventId: string; committedAtMs: number;
      before: GrowthProjection; after: GrowthProjection;
    }>
  | Readonly<{
      kind: 'synthetic_growth_fixture'; fixtureId: string;
      before: GrowthProjection; after: GrowthProjection;
    }>
  | Readonly<{ kind: 'committed_meal'; eventId: string; committedAtMs: number; mode: 'direct' | 'auto' }>
  | Readonly<{ kind: 'clean_result'; result: 'nothing_to_clean' | 'auto_toilet' | 'cleaned' }>;

export type ReactionContext = Readonly<{
  petId: string;
  displayName?: string;
  trigger: ReactionTrigger;
  personality: PersonalityStyle;
  growthStage: GrowthProjection['stage'];
  source?: ReactionSource;
  domainState: Readonly<{
    sleeping: boolean;
    hibernating: boolean;
    condition: 'well' | 'needs_care';
    cleanliness: 'clean' | 'needs_cleanup';
  }>;
  affordances: readonly ReactionAffordance[];
  activeFamily?: string;
  touchTarget?: 'head' | 'body' | 'unknown';
  evidence?: ReactionEvidence;
}>;

export type ReactionConditions = Readonly<{
  triggers: readonly ReactionTrigger[];
  sources?: readonly ReactionSource[];
  personalities?: readonly PersonalityStyle[];
  minGrowthStage?: number;
  maxGrowthStage?: number;
  requireAffordances?: readonly ReactionAffordance[];
  forbidAffordances?: readonly ReactionAffordance[];
  sleeping?: boolean;
  hibernating?: boolean;
  conditions?: readonly ('well' | 'needs_care')[];
  cleanliness?: readonly ('clean' | 'needs_cleanup')[];
  touchTargets?: readonly ('head' | 'body' | 'unknown')[];
  evidenceKinds?: readonly ReactionEvidence['kind'][];
  cleanResults?: readonly ('nothing_to_clean' | 'auto_toilet' | 'cleaned')[];
}>;

export type ReactionPresentation = Readonly<{
  clip: ReactionClip;
  rate: number;
  emotion: MomentEmotion;
  gaze: GazeDirection;
  holdPose?: Readonly<{ clip: ReactionClip; normalizedTime: number; durationMs: number }>;
  minVisibleMs: number;
}>;

export type DialogueChoice = Readonly<{ id: string; label: string; nextId: string }>;
export type DialogueNode =
  | Readonly<{ id: string; kind: 'line'; text: string; minReadMs: number; nextId?: string; presentation?: ReactionPresentation }>
  | Readonly<{ id: string; kind: 'choice'; prompt: string; choices: readonly DialogueChoice[]; timeoutMs: number | null; timeoutNextId?: string }>
  | Readonly<{ id: string; kind: 'end' }>;
export type ReactionDialogue = Readonly<{ startId: string; nodes: readonly DialogueNode[] }>;

export type ReactionDefinition = Readonly<{
  id: string;
  family: ReactionFamily;
  priority: number;
  conditions: ReactionConditions;
  presentation: ReactionPresentation;
  dialogue?: ReactionDialogue;
  repeat: Readonly<{ reactionCooldownMs: number; familyWindowMs: number; maxFamilyInWindow: number }>;
}>;

export type ReactionCatalog = readonly ReactionDefinition[];

export type ReactionMemoryRecord = Readonly<{
  schemaVersion: 1;
  sessionId: string;
  petId: string;
  source: ReactionSource;
  reactionId: string;
  family: ReactionFamily;
  shownAtMs: number;
  outcome: 'shown' | 'completed' | 'cancelled';
  settledAtMs: number | null;
}>;

export type ReactionMemorySnapshot = Readonly<{
  schemaVersion: 1;
  petId: string;
  source: ReactionSource;
  records: readonly ReactionMemoryRecord[];
}>;

export type SelectionExclusion = Readonly<{ reactionId: string; reasons: readonly string[] }>;
export type ReactionSelectionExplanation = Readonly<{
  considered: number;
  eligible: readonly string[];
  excluded: readonly SelectionExclusion[];
  selectedId: string;
  usedRepeatOverride: boolean;
  usedSafeFallback: boolean;
  catalogErrors: readonly string[];
}>;
export type ReactionSelection = Readonly<{
  reaction: ReactionDefinition;
  explanation: ReactionSelectionExplanation;
}>;

export type PresentationCommand =
  | Readonly<{ type: 'play_clip'; clip: ReactionClip; rate: number }>
  | Readonly<{ type: 'hold_pose'; clip: ReactionClip; normalizedTime: number; durationMs: number }>
  | Readonly<{ type: 'set_gaze'; direction: GazeDirection }>
  | Readonly<{ type: 'set_emotion'; emotion: MomentEmotion }>
  | Readonly<{ type: 'show_dialogue'; text: string; choices: readonly Readonly<{ id: string; label: string }>[] }>
  | Readonly<{ type: 'clear_presentation' }>;

export type ReactionSessionPhase = 'presenting' | 'awaiting_choice' | 'follow_up' | 'completed' | 'cancelled';
export type ReactionSession = Readonly<{
  id: string;
  petId: string;
  displayName: string;
  source: ReactionSource;
  reactionId: string;
  family: string;
  phase: ReactionSessionPhase;
  startedAtMs: number;
  deadlineAtMs: number | null;
  dialogueNodeId: string | null;
  presentation: ReactionPresentation;
  dialogue?: ReactionDialogue;
}>;

export type ReactionOutcome =
  | Readonly<{ kind: 'completed'; sessionId: string; petId: string; source: ReactionSource; reactionId: string; family: string; atMs: number }>
  | Readonly<{ kind: 'cancelled'; sessionId: string; petId: string; source: ReactionSource; reactionId: string; family: string; atMs: number; reason: 'user' | 'background' | 'scene_change' | 'superseded' }>;

export type SessionTransition = Readonly<{
  session: ReactionSession;
  commands: readonly PresentationCommand[];
  outcome?: ReactionOutcome;
}>;
