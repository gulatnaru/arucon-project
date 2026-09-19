import {
  DevSleepBenefitPolicy, type SleepBenefitPolicy, type SleepScoreProvider, type SleepScoreResult,
} from '../sleep';

export type PreparedDevSleepFixture =
  | Readonly<{ status: 'ready'; growthMultiplier: number; notice: string }>
  | Readonly<{ status: 'unavailable' | 'error' | 'decision_required'; notice: string }>;

/** Resolve once before a write so retrying a command cannot change its payload. */
export async function prepareDevSleepFixture(
  provider: SleepScoreProvider,
  gameDayId: string,
  policy: SleepBenefitPolicy = new DevSleepBenefitPolicy(),
): Promise<PreparedDevSleepFixture> {
  let score: SleepScoreResult;
  try {
    score = await provider.getScore(gameDayId);
  } catch {
    score = { status: 'error' };
  }
  const benefit = policy.resolve(score);
  if (benefit.status === 'decision_required') {
    return { status: 'decision_required', notice: 'DEV 수면 점수 산식은 DEC-05 결정 대기 중이에요. 기존 배율을 유지해요.' };
  }
  if (benefit.scoreStatus === 'unavailable') {
    return { status: 'unavailable', notice: 'DEV 합성 수면 입력을 사용할 수 없어요. 기존 배율을 유지해요.' };
  }
  if (benefit.scoreStatus === 'error') {
    return { status: 'error', notice: 'DEV 합성 수면 입력 오류예요. 기존 배율을 유지해요.' };
  }
  return {
    status: 'ready',
    growthMultiplier: benefit.growthMultiplier,
    notice: benefit.scoreStatus === 'no_data'
      ? `DEV 무기록 fixture: 성장 배율 ${benefit.growthMultiplier.toFixed(1)} (중립)`
      : `DEV 합성 수면 점수 ${score.status === 'valid' ? score.score : '?'}: 성장 배율 ${benefit.growthMultiplier.toFixed(1)}`,
  };
}
