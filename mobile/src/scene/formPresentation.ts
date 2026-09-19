import { CharacterFormCatalog, type FormId } from '../domain/model';

export const COMMON_PREVIEW_ASSET_KEY = 'arucon_common_preview' as const;

export type FormPresentation = Readonly<{
  formId: FormId;
  displayName: string;
  assetKey: typeof COMMON_PREVIEW_ASSET_KEY;
  artStatus: 'common_preview' | 'approved_reference_runtime_asset_missing';
  releaseRuntimeAssetReady: false;
}>;

/**
 * The repository currently has one common preview GLB. Persisted form identity
 * still reaches the renderer, while missing first-form art remains explicit.
 * Personality is deliberately absent from this selector.
 */
export function selectFormPresentation(formId: FormId): FormPresentation {
  const catalog = CharacterFormCatalog[formId];
  if (!catalog) throw new Error('Unknown character form');
  return Object.freeze({
    formId,
    displayName: catalog.displayName,
    assetKey: COMMON_PREVIEW_ASSET_KEY,
    artStatus: formId === 'arucon' ? 'common_preview' : 'approved_reference_runtime_asset_missing',
    releaseRuntimeAssetReady: false,
  });
}

export function formPresentationText(selection: FormPresentation): string {
  return selection.artStatus === 'common_preview'
    ? `${selection.displayName} · 공통 미리보기 아트`
    : `${selection.displayName} · 승인 2D 참고형 · 전용 런타임 자산 준비 전 · 공통 미리보기 표시`;
}
