import type { GrowthStage } from '../progression/projection';

/** Reversible expression only; EXP thresholds and form resolver remain authoritative. */
export function growthExpression(stage: GrowthStage) {
  const mature = stage === 'final' ? 4 : Math.max(1, Math.min(4, stage));
  return {
    maturity: mature,
    scale: [1, 1.06, 1.10, 1.13][mature - 1],
    stretchLift: [0.10, 0.16, 0.18, 0.20][mature - 1],
    settleLean: [0.06, 0.10, 0.13, 0.15][mature - 1],
    description: [
      '작게 몸을 풀고 주변을 하나씩 살펴봐요.',
      '앞발을 번갈아 정돈하고, 기지개를 길게 펴며 곁에 편히 기대요.',
      '새 외형으로 공을 다루고, 두 앞발을 모아 더 안정적으로 자리 잡아요.',
      '느긋하게 몸을 풀고, 익숙한 자리에서 여유 있게 방향을 바꿔요.',
    ][mature - 1],
    next: mature < 4 ? [
      '다음 단계에서는 더 길게 기지개를 켜고 앞발을 번갈아 정돈해요.',
      'Lv.16과 여러 날의 기록이 모이면 1차 외형과 자리 잡는 자세가 달라져요.',
      '다음 단계에서는 익숙한 자리에서 한층 느긋하게 몸을 풀어요.',
    ][mature - 1] : null,
  };
}
