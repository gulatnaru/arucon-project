import { widgetView, type WidgetSnapshotRead, type WidgetSnapshotReader, type WidgetView } from '../widget';
import type { DevLifeService } from './devLifeService';

export type DevWidgetScenario = 'ready' | 'stale' | 'missing' | 'error' | 'unsupported';

/** DEV-only reader. The live path loads the persisted projection and never issues a game command. */
export function devWidgetSnapshotReader(
  service: Pick<DevLifeService, 'readWidgetProjection'>,
  nowMs: number,
  scenario: DevWidgetScenario,
): WidgetSnapshotReader {
  return {
    async read(): Promise<WidgetSnapshotRead> {
      if (scenario === 'missing' || scenario === 'error' || scenario === 'unsupported') return { status: scenario };
      try {
        return { status: 'ready', projection: await service.readWidgetProjection(nowMs) };
      } catch {
        return { status: 'error' };
      }
    },
  };
}

/** DEV clock/age fixtures exercise both display branches without approving an OS stale threshold. */
export async function readDevWidgetPreview(
  reader: WidgetSnapshotReader,
  scenario: DevWidgetScenario,
  observedAtMs: number,
): Promise<WidgetView> {
  const read = await reader.read();
  if (read.status !== 'ready') return widgetView(read, observedAtMs, 0);
  if (scenario === 'stale') {
    const fixtureNow = Math.max(observedAtMs, read.projection.updatedAtMs + 1);
    return widgetView(read, fixtureNow, 0);
  }
  return widgetView(read, observedAtMs, observedAtMs - read.projection.updatedAtMs);
}
