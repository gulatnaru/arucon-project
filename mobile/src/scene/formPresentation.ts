import { CharacterFormCatalog, type FormId } from '../domain/model';

export const COMMON_PREVIEW_ASSET_KEY = 'arucon_common_preview' as const;

export type FormPresentation = Readonly<{
  formId: FormId;
  displayName: string;
  assetKey: typeof COMMON_PREVIEW_ASSET_KEY | 'mallu' | 'mono' | 'piko' | 'mongle';
  artStatus: 'common_preview' | 'living_draft_user_review_pending';
  releaseRuntimeAssetReady: false;
}>;

/**
 * LIFE-00 introduces distinct editable draft meshes. They are not final art.
 * Personality is deliberately absent from this selector.
 */
export function selectFormPresentation(formId: FormId): FormPresentation {
  const catalog = CharacterFormCatalog[formId];
  if (!catalog) throw new Error('Unknown character form');
  return Object.freeze({
    formId,
    displayName: catalog.displayName,
    assetKey: formId === 'arucon' ? COMMON_PREVIEW_ASSET_KEY : formId,
    artStatus: formId === 'arucon' ? 'common_preview' : 'living_draft_user_review_pending',
    releaseRuntimeAssetReady: false,
  });
}

export function formPresentationText(selection: FormPresentation): string {
  return selection.artStatus === 'common_preview'
    ? `${selection.displayName} · 공통 미리보기 아트`
    : `${selection.displayName} · 게임용 초안 · 최종 아트 검토 전`;
}
