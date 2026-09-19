import type {
  AruconNativeHealthContract,
  AruconNativeHealthModule,
} from '../../native/arucon-health';
import type {
  NativeActivityAggregateRead,
  NativeHealthAvailability,
  NativeHealthBridge,
  NativeHealthScope,
  NativeReadPermission,
  NativeSleepScoreRead,
} from './health';
import type { GameDayWindow } from '../activity/activityProvider';

export type ExpoNativeHealthBridgeOptions = Readonly<{
  enabled?: boolean;
  nativeModule?: AruconNativeHealthModule | null;
}>;

function isDisabledContract(value: unknown): value is AruconNativeHealthContract {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AruconNativeHealthContract>;
  return candidate.contractVersion === 1 && candidate.readMode === 'disabled' &&
    (candidate.platform === 'ios' || candidate.platform === 'android');
}

/**
 * Adapter for the build-linked local module. Both the app gate and the native
 * contract must be enabled before future reads can exist. The current native
 * contract is deliberately disabled, so all read and prompt paths fail closed.
 */
export class ExpoNativeHealthBridge implements NativeHealthBridge {
  private readonly enabled: boolean;
  private readonly nativeModule: AruconNativeHealthModule | null;

  constructor(options: ExpoNativeHealthBridgeOptions = {}) {
    this.enabled = options.enabled ?? false;
    this.nativeModule = options.nativeModule ?? null;
  }

  private async disabledContract(): Promise<AruconNativeHealthContract | null> {
    if (!this.enabled || !this.nativeModule) return null;
    try {
      const contract = await this.nativeModule.getContractAsync();
      return isDisabledContract(contract) ? contract : null;
    } catch {
      return null;
    }
  }

  async inspectAvailability(_scope: NativeHealthScope): Promise<NativeHealthAvailability> {
    const contract = await this.disabledContract();
    return {
      status: 'unavailable',
      platform: contract?.platform ?? 'android',
      reason: 'missing_service',
    };
  }

  async getReadPermission(_scope: NativeHealthScope): Promise<NativeReadPermission> {
    return 'not_requested';
  }

  /** Permission prompts are outside this integration scaffold. */
  async requestReadPermission(_scope: NativeHealthScope): Promise<NativeReadPermission> {
    return 'not_requested';
  }

  async readActivityAggregate(_gameDay: GameDayWindow): Promise<NativeActivityAggregateRead> {
    return { status: 'error', providerId: 'native-read-disabled' };
  }

  async readSleepScore(_gameDayId: string, _scorerVersion: string): Promise<NativeSleepScoreRead> {
    return { status: 'error' };
  }
}
