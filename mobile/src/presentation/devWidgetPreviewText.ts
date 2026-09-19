import type { WidgetView } from '../widget';

/** Text-only DEV rendering of the same read-only view a native widget would receive. */
export function devWidgetPreviewText(view: WidgetView): string {
  const updated = view.lastUpdatedAtMs === undefined
    ? '마지막 갱신: 없음'
    : `마지막 갱신: ${new Date(view.lastUpdatedAtMs).toISOString()}`;
  return [
    `DEV 위젯 미리보기 · ${view.status}`,
    view.formId ? `${view.formId} · ${view.stateText}` : view.stateText,
    updated,
    `동작: ${view.action.type}`,
  ].join('\n');
}
