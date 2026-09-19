import { MVP_BALANCE_REGISTRY } from '../config/balanceRegistry';
import { APPROVED_MVP_POLICY } from '../config/approvedMvpPolicy';

export type SleepBalanceConfig = Readonly<{
  mode: 'DEV_FIXTURE_ONLY' | 'APPROVED';
  version: string;
  provenance: string;
  noDataMultiplier: number;
  curve: readonly Readonly<{ score: number; multiplier: number }>[];
}>;

/** SRS section 9 source curve; this does not configure the OPEN raw-data scorer. */
export const DEV_SLEEP_CONFIG: SleepBalanceConfig = Object.freeze({
  mode: 'DEV_FIXTURE_ONLY',
  version: MVP_BALANCE_REGISTRY.version,
  provenance: `${MVP_BALANCE_REGISTRY.provenance.source}; DEC-05 scorer remains OPEN`,
  noDataMultiplier: MVP_BALANCE_REGISTRY.source.sleep.noDataMultiplier,
  curve: MVP_BALANCE_REGISTRY.source.sleep.curve,
});

export const APPROVED_SLEEP_CONFIG: SleepBalanceConfig = Object.freeze({
  mode: 'APPROVED',
  version: `${APPROVED_MVP_POLICY.version}:sleep`,
  provenance: 'conversation approval 34ab069; game reward baseline, not medical guidance',
  noDataMultiplier: APPROVED_MVP_POLICY.sleep.noDataMultiplier,
  curve: APPROVED_MVP_POLICY.sleep.curve,
});

export function validateSleepConfig(config: SleepBalanceConfig): void {
  if (!['DEV_FIXTURE_ONLY', 'APPROVED'].includes(config.mode) || !config.version || !config.provenance ||
      config.curve.length < 2 || config.curve[0].score !== 0 || config.curve.at(-1)?.score !== 100) {
    throw new Error('Invalid sleep curve configuration');
  }
  for (let i = 0; i < config.curve.length; i++) {
    const point = config.curve[i];
    const previous = config.curve[i - 1];
    if (!Number.isFinite(point.score) || !Number.isFinite(point.multiplier) || point.multiplier <= 0 ||
        (previous && (point.score <= previous.score || point.multiplier < previous.multiplier))) {
      throw new Error('Sleep curve must have increasing scores and nondecreasing positive multipliers');
    }
  }
  if (!Number.isFinite(config.noDataMultiplier) || config.noDataMultiplier < config.curve[0].multiplier ||
      config.noDataMultiplier > config.curve[config.curve.length - 1].multiplier) {
    throw new Error('Invalid no-data multiplier');
  }
}
