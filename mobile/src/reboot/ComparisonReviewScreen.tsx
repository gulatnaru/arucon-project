import React, { useMemo, useState } from 'react';
import { RebootReviewScreen } from './RebootReviewScreen';
import { makeComparisonCase, newComparisonId } from './comparison';
import type { PersonalityId } from './personality';

/** Fresh cases preserve prior cases and all three original review pets. */
export function ComparisonReviewScreen({ onExit }: { onExit: () => void }) {
  const [profile, setProfile] = useState<PersonalityId>('playful');
  const [id, setId] = useState(newComparisonId);
  const [pacing, setPacing] = useState<'tail' | 'ahead'>('tail');
  const [culling, setCulling] = useState(false);
  const [anchor] = useState(Date.now);
  const controlled = useMemo(() => makeComparisonCase(id, profile, anchor), [id, profile, anchor]);
  const restart = () => setId(newComparisonId());
  return <RebootReviewScreen key={id} personalityReview={profile} controlled={controlled}
    comparisonPacing={pacing} onComparisonPacing={next => { setPacing(next); restart(); }}
    comparisonCulling={culling} onComparisonCulling={next => { setCulling(next); restart(); }}
    onControlledRestart={restart} onPersonality={next => { setProfile(next); restart(); }} onExit={onExit} />;
}
