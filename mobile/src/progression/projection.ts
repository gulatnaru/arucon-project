import { BalanceDecisionRequired, MVP_BALANCE_REGISTRY } from '../config/balanceRegistry';
import { APPROVED_MVP_POLICY } from '../config/approvedMvpPolicy';

export type GrowthBand = Readonly<{
  stage: number;
  fromLevel: number;
  toLevel: number;
  expPerLevel: number;
}>;

/**
 * DEC-03's level-cost interpretation is not an operational default.
 * Callers must explicitly inject a DEV fixture until the decision is approved.
 */
export type GrowthProjectionPolicy = Readonly<{
  status: 'DEV_FIXTURE_ONLY' | 'APPROVED';
  version: string;
  initialLevel: number;
  finalLevel: number;
  expScale: number;
  bands: readonly GrowthBand[];
}>;

export type GrowthStage = number | 'final';

export type GrowthProjection = Readonly<{
  totalExpUnits: number;
  level: number;
  stage: GrowthStage;
  expIntoLevelUnits: number;
  expToNextLevelUnits: number | null;
  overflowExpUnits: number;
  atFinalLevel: boolean;
}>;

export type GrowthBoundary = Readonly<{
  level: number;
  stage: GrowthStage;
  stageChanged: boolean;
  thresholdExpUnits: number;
}>;

export type GrowthTransition = Readonly<{
  before: GrowthProjection;
  after: GrowthProjection;
  crossed: readonly GrowthBoundary[];
}>;

const SOURCE_GROWTH = MVP_BALANCE_REGISTRY.source.growth;
const EXP_SCALE = MVP_BALANCE_REGISTRY.devFixture.domain.expScale;

/** SRS 9 source values under the still-unapproved DEC-03 interpretation. */
export const DEV_SOURCE_GROWTH_POLICY: GrowthProjectionPolicy = Object.freeze({
  status: 'DEV_FIXTURE_ONLY' as const,
  version: `${MVP_BALANCE_REGISTRY.version}:growth-dec03-dev`,
  initialLevel: 1,
  finalLevel: SOURCE_GROWTH.finalLevel,
  expScale: EXP_SCALE,
  bands: Object.freeze(SOURCE_GROWTH.stages.map((band, index) => Object.freeze({
    stage: index + 1,
    fromLevel: band.fromLevel,
    toLevel: band.toLevel,
    expPerLevel: band.expPerLevel,
  }))),
});

export const APPROVED_GROWTH_POLICY: GrowthProjectionPolicy = Object.freeze({
  status: 'APPROVED',
  version: `${APPROVED_MVP_POLICY.version}:growth`,
  initialLevel: APPROVED_MVP_POLICY.growth.initialLevel,
  finalLevel: APPROVED_MVP_POLICY.growth.finalLevel,
  expScale: APPROVED_MVP_POLICY.growth.expScale,
  bands: APPROVED_MVP_POLICY.growth.bands,
});

function safePositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

export function validateGrowthProjectionPolicy(policy: GrowthProjectionPolicy): void {
  if (!policy || !['DEV_FIXTURE_ONLY', 'APPROVED'].includes(policy.status) || !policy.version ||
      !safePositiveInteger(policy.initialLevel) || !safePositiveInteger(policy.finalLevel) ||
      policy.finalLevel <= policy.initialLevel || !safePositiveInteger(policy.expScale) ||
      !Array.isArray(policy.bands) || policy.bands.length === 0) {
    throw new Error('Invalid growth projection policy identity');
  }

  let expectedLevel = policy.initialLevel;
  let expectedStage = 1;
  for (const band of policy.bands) {
    if (!safePositiveInteger(band.stage) || band.stage !== expectedStage ||
        !safePositiveInteger(band.fromLevel) || band.fromLevel !== expectedLevel ||
        !safePositiveInteger(band.toLevel) || band.toLevel < band.fromLevel ||
        !safePositiveInteger(band.expPerLevel) ||
        !Number.isSafeInteger(band.expPerLevel * policy.expScale)) {
      throw new Error('Invalid growth projection policy band');
    }
    expectedLevel = band.toLevel + 1;
    expectedStage++;
  }
  if (expectedLevel !== policy.finalLevel) throw new Error('Growth bands do not end at final level');
}

function levelBoundaries(policy: GrowthProjectionPolicy): GrowthBoundary[] {
  validateGrowthProjectionPolicy(policy);
  const boundaries: GrowthBoundary[] = [];
  let thresholdExpUnits = 0;
  for (let bandIndex = 0; bandIndex < policy.bands.length; bandIndex++) {
    const band = policy.bands[bandIndex];
    for (let level = band.fromLevel; level <= band.toLevel; level++) {
      thresholdExpUnits += band.expPerLevel * policy.expScale;
      if (!Number.isSafeInteger(thresholdExpUnits)) throw new Error('Growth threshold exceeds safe integer range');
      const nextLevel = level + 1;
      const final = nextLevel === policy.finalLevel;
      const nextStage = final ? 'final' as const : (policy.bands[bandIndex + 1]?.fromLevel === nextLevel
        ? policy.bands[bandIndex + 1].stage
        : band.stage);
      boundaries.push(Object.freeze({
        level: nextLevel,
        stage: nextStage,
        stageChanged: final || nextStage !== band.stage,
        thresholdExpUnits,
      }));
    }
  }
  return boundaries;
}

/** Pure projection. It never mutates PetState or grants an economy reward. */
export function projectGrowth(totalExpUnits: number, policy: GrowthProjectionPolicy): GrowthProjection {
  if (!Number.isSafeInteger(totalExpUnits) || totalExpUnits < 0) throw new Error('Invalid total EXP units');
  const boundaries = levelBoundaries(policy);
  let level = policy.initialLevel;
  let stage: GrowthStage = policy.bands[0].stage;
  let previousThreshold = 0;

  for (const boundary of boundaries) {
    if (totalExpUnits < boundary.thresholdExpUnits) {
      return Object.freeze({
        totalExpUnits,
        level,
        stage,
        expIntoLevelUnits: totalExpUnits - previousThreshold,
        expToNextLevelUnits: boundary.thresholdExpUnits - totalExpUnits,
        overflowExpUnits: 0,
        atFinalLevel: false,
      });
    }
    level = boundary.level;
    stage = boundary.stage;
    previousThreshold = boundary.thresholdExpUnits;
  }

  return Object.freeze({
    totalExpUnits,
    level,
    stage,
    expIntoLevelUnits: 0,
    expToNextLevelUnits: null,
    overflowExpUnits: totalExpUnits - previousThreshold,
    atFinalLevel: true,
  });
}

/** Lists every crossed level boundary once, in threshold order. */
export function projectGrowthTransition(
  previousTotalExpUnits: number,
  nextTotalExpUnits: number,
  policy: GrowthProjectionPolicy,
): GrowthTransition {
  if (!Number.isSafeInteger(previousTotalExpUnits) || previousTotalExpUnits < 0 ||
      !Number.isSafeInteger(nextTotalExpUnits) || nextTotalExpUnits < previousTotalExpUnits) {
    throw new Error('Invalid growth transition EXP units');
  }
  const boundaries = levelBoundaries(policy);
  return Object.freeze({
    before: projectGrowth(previousTotalExpUnits, policy),
    after: projectGrowth(nextTotalExpUnits, policy),
    crossed: Object.freeze(boundaries.filter(boundary =>
      boundary.thresholdExpUnits > previousTotalExpUnits && boundary.thresholdExpUnits <= nextTotalExpUnits)),
  });
}

/** No operational interpretation is selected while DEC-03 remains unapproved. */
export function requireOperationalGrowthPolicy(): never {
  throw new BalanceDecisionRequired(['DEC-03']);
}
