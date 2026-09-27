import { APPROVED_GROWTH_POLICY, projectGrowth } from '../progression/projection';
import type { GrowthContextBase } from './growth';
import type { ReactionContext } from './types';
import { assertValidReactionContext } from './validation';

export type GrowthComparisonFixture = Readonly<{
  fixture: true;
  label: '합성 성장 비교 · 실제 저장과 분리';
  fixtureId: string;
  context: ReactionContext;
}>;

/** Pure preview data. Its fixture source is rejected by the live memory repository. */
export function createGrowthComparisonFixture(
  base: GrowthContextBase,
  options: Readonly<{ fixtureId: string; beforeExpUnits: number; afterExpUnits: number }>,
): GrowthComparisonFixture {
  if (!/^[a-z0-9][a-z0-9_-]{0,47}$/u.test(options.fixtureId)) throw new Error('Invalid growth fixture id');
  if (!Number.isSafeInteger(options.beforeExpUnits) || !Number.isSafeInteger(options.afterExpUnits) ||
      options.beforeExpUnits < 0 || options.afterExpUnits <= options.beforeExpUnits) throw new Error('Invalid growth fixture EXP range');
  const before = projectGrowth(options.beforeExpUnits, APPROVED_GROWTH_POLICY);
  const after = projectGrowth(options.afterExpUnits, APPROVED_GROWTH_POLICY);
  const context: ReactionContext = {
    ...base,
    trigger: 'growth_committed',
    source: 'fixture',
    growthStage: after.stage,
    evidence: { kind: 'synthetic_growth_fixture', fixtureId: options.fixtureId, before, after },
  };
  assertValidReactionContext(context);
  return Object.freeze({ fixture: true, label: '합성 성장 비교 · 실제 저장과 분리', fixtureId: options.fixtureId, context });
}
