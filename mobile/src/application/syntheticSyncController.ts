import { createSyntheticAccessFixture, SyntheticAccessAuthority, type SyntheticAccessGrant } from '../auth/syntheticAccess';
import { APPROVED_GAME_CONFIG } from '../domain/config';
import type { PetState } from '../domain/model';
import { buildSyntheticOutboundEnvelope } from '../privacy/outbound';
import { SqliteServerConfirmedRecoveryStore } from '../storage/serverRecovery';
import { LocalPetStore, type SqlConnection } from '../storage/sqlite';
import { SqliteSyncQueue } from '../storage/syncQueue';
import { SqliteSyncRegistrationStore } from '../storage/syncRegistration';
import { bootstrapSyntheticLocalWriter, DurableSyncStatusReader } from '../sync/bootstrap';
import { SyncCoordinator, type FlushResult } from '../sync/coordinator';
import type { WriterIdentity } from '../sync/contracts';
import { SyntheticSingleWriterAuthority, type WriterTransferResult } from '../sync/deviceAuthority';
import { CappedExponentialRetryPolicy } from '../sync/retryPolicy';
import { SyncApplicationService } from '../sync/service';
import { SyntheticIdempotentServer } from '../sync/syntheticServer';
import type { SyncStatusViewModel } from '../sync/status';
import type { LocalWriteAuthorityGuard } from '../sync/writeGuard';

export class SyntheticAuthorityUnavailableError extends Error {
  constructor() {
    super('Local synthetic authority is unavailable after restart; no writer was reactivated');
    this.name = 'SyntheticAuthorityUnavailableError';
  }
}

export type SyntheticSyncRuntime = Readonly<{
  mode: 'LOCAL_SYNTHETIC';
  authority: 'in_process_fake' | 'unavailable_after_restart';
  notice: string;
}>;

export type LocalSyntheticSyncController = Readonly<{
  runtime: SyntheticSyncRuntime;
  writer: WriterIdentity;
  writeGuard: LocalWriteAuthorityGuard;
  status(): Promise<SyncStatusViewModel>;
  flush(limit?: number): Promise<FlushResult>;
  handoff(handoffId: string, targetDeviceId: string): Promise<Readonly<{
    transfer: WriterTransferResult;
    status: SyncStatusViewModel;
    notice: string;
  }>>;
}>;

function grant(accountId: string, petId: string, deviceId: string, purpose: 'pet_access' | 'outbound_aggregate'): SyntheticAccessGrant {
  const access = new SyntheticAccessAuthority(createSyntheticAccessFixture({
    accountId, petId, deviceId, accountStatus: 'active', deviceStatus: 'active', consentState: 'verified',
  }));
  const decision = access.authorize({ accountId, petId, deviceId, purpose });
  if (decision.status !== 'allowed') throw new Error(`Synthetic access fixture blocked: ${decision.reason}`);
  return decision.grant;
}

function requiredId(value: string, name: string): string {
  if (!value || value.trim() !== value || value.length > 160 || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new Error(`Invalid ${name}`);
  }
  return value;
}

async function committedStateForAction(db: SqlConnection, petId: string, actionId: string): Promise<PetState> {
  const command = await db.getFirstAsync<{ result_json: string }>(
    'SELECT result_json FROM command_ledger WHERE pet_id = ? AND command_id = ?', [petId, actionId],
  );
  const purchase = await db.getFirstAsync<{ result_state_json: string }>(
    'SELECT result_state_json FROM dev_purchase_ledger WHERE pet_id = ? AND purchase_id = ?', [petId, actionId],
  );
  const sleep = await db.getFirstAsync<{ result_state_json: string }>(
    'SELECT result_state_json FROM dev_sleep_benefit_ledger WHERE pet_id = ? AND command_id = ?', [petId, actionId],
  );
  const matches = [command, purchase, sleep].filter(Boolean);
  if (matches.length !== 1) throw new Error('Synthetic outbox action must have exactly one committed state');
  const parsed = command ? (JSON.parse(command.result_json) as { state?: PetState }).state :
    JSON.parse((purchase ?? sleep)!.result_state_json) as PetState;
  if (!parsed || parsed.petId !== petId) throw new Error('Synthetic outbox committed state mismatch');
  return parsed;
}

function displayState(state: PetState): 'awake' | 'sleeping' | 'hibernating' | 'needs_care' {
  return state.hibernating ? 'hibernating' : state.sleeping ? 'sleeping' :
    state.condition === 'low' ? 'needs_care' : 'awake';
}

/**
 * App-facing local demonstration. Existing registrations never reconstruct an
 * authority: restart retains status/read-only knowledge but cannot claim a
 * server lock. A fresh or legacy-unregistered pet may start one explicit fake.
 */
export async function createLocalSyntheticSyncController(input: Readonly<{
  db: SqlConnection;
  state: PetState;
  accountId: string;
  deviceId: string;
  nowMs: () => number;
}>): Promise<LocalSyntheticSyncController> {
  const accountId = requiredId(input.accountId, 'synthetic account ID');
  const deviceId = requiredId(input.deviceId, 'synthetic device ID');
  const now = input.nowMs();
  if (!Number.isSafeInteger(now) || now < 0) throw new Error('Invalid synthetic sync clock');
  const migrationStore = new LocalPetStore(input.db, APPROVED_GAME_CONFIG);
  await migrationStore.migrate();
  const registrations = new SqliteSyncRegistrationStore(input.db);
  const recovery = new SqliteServerConfirmedRecoveryStore(input.db, APPROVED_GAME_CONFIG);
  const existing = await registrations.load(input.state.petId);
  const firstAuthority = existing === null;
  const initial = existing ?? (await bootstrapSyntheticLocalWriter(input.db, migrationStore, input.state, {
    accountId, deviceId, deviceEpoch: 0, access: 'active_writer',
    authorityEventId: 'local-synthetic-bootstrap-v1', updatedAtMs: now,
  })).registration;
  if (initial.accountId !== accountId || initial.deviceId !== deviceId) throw new Error('Synthetic controller scope mismatch');
  const writer = Object.freeze({ deviceId: initial.deviceId, deviceEpoch: initial.deviceEpoch });

  if (!firstAuthority) {
    const queue = new SqliteSyncQueue(input.db, { project() { throw new SyntheticAuthorityUnavailableError(); } });
    const reader = new DurableSyncStatusReader(queue, registrations, recovery);
    const guard = (await bootstrapSyntheticLocalWriter(input.db, migrationStore, input.state, {
      accountId, deviceId, deviceEpoch: initial.deviceEpoch, access: initial.access,
      authorityEventId: initial.authorityEventId, updatedAtMs: initial.updatedAtMs,
    })).writeGuard;
    const unavailable = (): never => { throw new SyntheticAuthorityUnavailableError(); };
    return Object.freeze({
      runtime: Object.freeze({
        mode: 'LOCAL_SYNTHETIC', authority: 'unavailable_after_restart',
        notice: '합성 권한은 재시작 후 복원되지 않았어요. 저장된 상태만 표시하며 쓰기 권한을 다시 만들지 않아요.',
      }),
      writer, writeGuard: guard,
      status: () => reader.read(input.state.petId),
      flush: async () => unavailable(),
      handoff: async () => unavailable(),
    });
  }

  const outboundGrant = grant(accountId, input.state.petId, deviceId, 'outbound_aggregate');
  const sourceGrant = grant(accountId, input.state.petId, deviceId, 'pet_access');
  const queue = new SqliteSyncQueue(input.db, {
    async project(record) {
      const committed = await committedStateForAction(input.db, record.petId, record.actionId);
      return buildSyntheticOutboundEnvelope(outboundGrant, {
        kind: 'pet_projection',
        projection: {
          petId: record.petId, stateRevision: committed.revision, updatedAtMs: input.nowMs(),
          formId: committed.formId, personalityProfileId: committed.personalityProfileId,
          displayState: displayState(committed),
        },
      });
    },
  });
  const checkpoint = Object.freeze({
    petId: input.state.petId, state: input.state, confirmedActionIds: Object.freeze([] as string[]),
    confirmedAtMs: now, serverRevision: input.state.revision, configVersion: APPROVED_GAME_CONFIG.version,
  });
  const authority = new SyntheticSingleWriterAuthority(accountId, input.state.petId, writer, checkpoint);
  const confirmedActionIds: string[] = [];
  const server = new SyntheticIdempotentServer({
    writerAuthority: authority,
    supportedConfigVersions: [APPROVED_GAME_CONFIG.version],
    sequencePolicy: { kind: 'monotonic', minimumFirstLocalSequence: 1 },
    firstConfirmedAtMs: now,
    async confirmedCheckpointForAction(action, receipt) {
      const state = await committedStateForAction(input.db, action.petId, action.actionId);
      const payload = action.envelope.payload;
      if (payload.kind !== 'pet_projection' || payload.petId !== state.petId ||
          payload.stateRevision !== state.revision || payload.formId !== state.formId ||
          payload.personalityProfileId !== state.personalityProfileId || payload.displayState !== displayState(state)) {
        throw new Error('Synthetic projection does not match its committed action state');
      }
      if (!confirmedActionIds.includes(action.actionId)) confirmedActionIds.push(action.actionId);
      return Object.freeze({
        petId: action.petId, state, confirmedActionIds: Object.freeze([...confirmedActionIds]),
        confirmedAtMs: receipt.confirmedAtMs, serverRevision: receipt.ackSequence,
        configVersion: action.configVersion,
      });
    },
  });
  const coordinator = new SyncCoordinator(
    queue, server, new CappedExponentialRetryPolicy(), { nowMs: input.nowMs }, { unit: () => 0 },
  );
  const service = new SyncApplicationService(
    queue, coordinator, authority, registrations,
    { accountId, petId: input.state.petId, deviceId }, input.nowMs, recovery,
  );
  return Object.freeze({
    runtime: Object.freeze({
      mode: 'LOCAL_SYNTHETIC', authority: 'in_process_fake',
      notice: '합성 인프로세스 동기화예요. 실제 계정·서버·네트워크 복구를 검증하지 않아요.',
    }),
    writer, writeGuard: service.writeGuard,
    status: () => service.status(input.state.petId, writer),
    flush: (limit = 20) => service.flush(limit),
    async handoff(handoffId: string, targetDeviceId: string) {
      const transfer = await service.handoff({
        handoffId, petId: input.state.petId, sourceGrant,
        targetGrant: grant(accountId, input.state.petId, requiredId(targetDeviceId, 'handoff target device ID'), 'pet_access'),
      });
      return Object.freeze({
        transfer,
        status: await service.status(input.state.petId, writer),
        notice: '합성 이전이 완료되어 이 설치는 읽기 전용이에요. 실제 서버 이전 결과가 아니에요.',
      });
    },
  });
}
