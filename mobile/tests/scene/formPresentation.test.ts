import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { CharacterFormCatalog, type FormId } from '../../src/domain/model';
import {
  COMMON_PREVIEW_ASSET_KEY, formPresentationText, selectFormPresentation,
} from '../../src/scene/formPresentation';

const here = dirname(fileURLToPath(import.meta.url));

test('form selector preserves every persisted form while explicitly falling back to the common preview asset', () => {
  const forms = Object.keys(CharacterFormCatalog) as FormId[];
  for (const formId of forms) {
    const selected = selectFormPresentation(formId);
    assert.equal(selected.formId, formId);
    assert.equal(selected.displayName, CharacterFormCatalog[formId].displayName);
    assert.equal(selected.assetKey, COMMON_PREVIEW_ASSET_KEY);
    assert.equal(selected.releaseRuntimeAssetReady, false);
    assert.deepEqual(Object.keys(selected).sort(), ['artStatus', 'assetKey', 'displayName', 'formId', 'releaseRuntimeAssetReady']);
  }
  assert.equal(selectFormPresentation('arucon').artStatus, 'common_preview');
  assert.equal(selectFormPresentation('mallu').artStatus, 'approved_reference_runtime_asset_missing');
  assert.match(formPresentationText(selectFormPresentation('piko')), /승인 2D 참고형.*전용 런타임 자산 준비 전/);
});

test('App passes persisted formId and renderer selects an asset by form without personality coupling', () => {
  const app = readFileSync(resolve(here, '../../App.tsx'), 'utf8');
  const controller = readFileSync(resolve(here, '../../src/scene/RoomController.ts'), 'utf8');
  assert.match(app, /<AruconRoom[\s\S]*?formId=\{pet\.formId\}/u);
  assert.match(controller, /selectFormPresentation\(props\.formId \?\? 'arucon'\)/u);
  assert.match(controller, /FORM_ASSETS\[this\.formPresentation\.assetKey\]/u);
  assert.doesNotMatch(readFileSync(resolve(here, '../../src/scene/formPresentation.ts'), 'utf8'), /personalityProfileId/u);
});
