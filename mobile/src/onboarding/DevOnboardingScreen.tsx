import React, { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import {
  buildDevPetPreview, createDevOnboardingDraft, setSyntheticAge,
  type DevOnboardingDraft, type DevPetPreview,
} from './devOnboarding';

/** Preview flow only: no account, guardian verification, or health permission request. */
export function DevOnboardingScreen({ onPreview }: { onPreview: (preview: DevPetPreview) => void }) {
  const [draft, setDraft] = useState<DevOnboardingDraft>(createDevOnboardingDraft);
  const [message, setMessage] = useState('');

  function preview() {
    try {
      const testToday = new Date().toISOString().slice(0, 10);
      const reviewed = setSyntheticAge(draft, draft.testBirthDateInput, testToday);
      const result = buildDevPetPreview(reviewed);
      setDraft(reviewed);
      setMessage(result.ageRoute === 'test_under_14' ? '보호자 동의 검토 필요 · 실제 검증되지 않음' : '연령 테스트 분기 · 실제 검증되지 않음');
      onPreview(result);
    } catch {
      setMessage('이름 본문과 테스트 날짜(YYYY-MM-DD)를 확인해 주세요.');
    }
  }

  return <View style={{ padding: 20, gap: 12 }}>
    <Text>로컬 개발용 합성 온보딩</Text>
    <Text>실제 가입이나 보호자 동의 검증이 아닙니다.</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <TextInput accessibilityLabel="이름 본문" value={draft.givenNameInput} onChangeText={givenNameInput => setDraft({ ...draft, givenNameInput })} placeholder="이름 본문" style={{ flex: 1 }} />
      <Text>콘</Text>
    </View>
    <TextInput accessibilityLabel="합성 생년월일" value={draft.testBirthDateInput} onChangeText={testBirthDateInput => setDraft({ ...draft, testBirthDateInput })} placeholder="테스트 날짜 YYYY-MM-DD" />
    <Button title="합성 아루콘 미리보기" onPress={preview} />
    <Text accessibilityRole="text">{message}</Text>
  </View>;
}
