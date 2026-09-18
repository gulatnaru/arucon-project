import { DEV_SLEEP_CONFIG, validateSleepConfig, type SleepBalanceConfig } from './config';

/** Game reward input only. No raw health samples belong in this boundary. */
export type SleepScoreResult =
  | { status: 'valid'; score: number }
  | { status: 'no_data' }
  | { status: 'unavailable' }
  | { status: 'error' }
  | { status: 'not_configured' };

export interface SleepScoreProvider {
  getScore(gameDayId: string): Promise<SleepScoreResult>;
}

/** The production default until DEC-05 approves a source and scoring specification. */
export class NotConfiguredSleepProvider implements SleepScoreProvider {
  async getScore(_gameDayId: string): Promise<SleepScoreResult> {
    return { status: 'not_configured' };
  }
}

export function assertSleepScore(score: number): void {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new RangeError('Sleep score must be a finite number from 0 to 100');
  }
}

/** Explicit synthetic days; a missing fixture is unavailable, not no_data. */
export class SyntheticSleepProvider implements SleepScoreProvider {
  private readonly scores: ReadonlyMap<string, number | null>;

  constructor(fixtures: Readonly<Record<string, number | null>>) {
    for (const [day, score] of Object.entries(fixtures)) {
      if (!day) throw new Error('Game day is required');
      if (score !== null) assertSleepScore(score);
    }
    this.scores = new Map(Object.entries(fixtures));
  }

  async getScore(gameDayId: string): Promise<SleepScoreResult> {
    if (!this.scores.has(gameDayId)) return { status: 'unavailable' };
    const score = this.scores.get(gameDayId);
    return score === null ? { status: 'no_data' } : { status: 'valid', score: score! };
  }
}

export const SYNTHETIC_SLEEP_FIXTURES = Object.freeze({
  'fixture-null': null,
  'fixture-0': 0,
  'fixture-70': 70,
  'fixture-100': 100,
});

export type SleepBenefit =
  | { status: 'ready'; growthMultiplier: number; scoreStatus: 'valid' | 'no_data' | 'unavailable' | 'error'; provisional: boolean }
  | { status: 'decision_required'; decision: 'DEC-05' };

export interface SleepBenefitPolicy {
  resolve(result: SleepScoreResult, confirmedDailyMultiplier?: number): SleepBenefit;
}

/** SRS score-to-growth curve. This policy is confined to synthetic development flows. */
export class DevSleepBenefitPolicy implements SleepBenefitPolicy {
  readonly mode = 'DEV_FIXTURE_ONLY' as const;

  constructor(private readonly config: SleepBalanceConfig = DEV_SLEEP_CONFIG) {
    validateSleepConfig(config);
  }

  resolve(result: SleepScoreResult, confirmedDailyMultiplier?: number): SleepBenefit {
    if (confirmedDailyMultiplier !== undefined &&
        (!Number.isFinite(confirmedDailyMultiplier) || confirmedDailyMultiplier < this.config.curve[0].multiplier ||
          confirmedDailyMultiplier > this.config.curve[this.config.curve.length - 1].multiplier)) {
      throw new RangeError('Invalid confirmed daily multiplier');
    }
    switch (result.status) {
      case 'valid':
        assertSleepScore(result.score);
        return { status: 'ready', growthMultiplier: confirmedDailyMultiplier ?? multiplierForScore(result.score, this.config), scoreStatus: 'valid', provisional: false };
      case 'no_data':
        return { status: 'ready', growthMultiplier: confirmedDailyMultiplier ?? this.config.noDataMultiplier, scoreStatus: 'no_data', provisional: false };
      case 'unavailable':
      case 'error':
        return { status: 'ready', growthMultiplier: confirmedDailyMultiplier ?? this.config.noDataMultiplier, scoreStatus: result.status, provisional: true };
      case 'not_configured':
        return { status: 'decision_required', decision: 'DEC-05' };
    }
  }
}

export function multiplierForScore(score: number, config: SleepBalanceConfig = DEV_SLEEP_CONFIG): number {
  assertSleepScore(score);
  validateSleepConfig(config);
  for (let i = 1; i < config.curve.length; i++) {
    const left = config.curve[i - 1];
    const right = config.curve[i];
    if (score <= right.score) {
      return left.multiplier + (right.multiplier - left.multiplier) * (score - left.score) / (right.score - left.score);
    }
  }
  throw new Error('Sleep score outside configured curve');
}
