import { DecisionRequired } from '../domain/config';
import type { PetState } from '../domain/model';
import type { DevAtomicTransactionStore, DevSleepBenefitCommit, DevSleepBenefitDecision } from '../storage/devTransactions';

export type DevSleepRecoveryRequest = Readonly<{
  commandId: string;
  petId: string;
  gameDayId: string;
  appliedAtMs: number;
}>;

export interface DevSleepRecoveryPolicy {
  decide(request: DevSleepRecoveryRequest, current: Readonly<PetState>): DevSleepBenefitDecision;
}

export class UnconfiguredSleepRecoveryPolicy implements DevSleepRecoveryPolicy {
  decide(_request: DevSleepRecoveryRequest, _current: Readonly<PetState>): never {
    throw new DecisionRequired('DEC-05 sleep recovery amount, eligibility, and game day');
  }
}

/** The caller injects the already-approved or explicitly synthetic day decision. */
export class DevSleepRecoveryService {
  constructor(
    private readonly transactions: DevAtomicTransactionStore,
    private readonly policy: DevSleepRecoveryPolicy = new UnconfiguredSleepRecoveryPolicy(),
  ) {}

  apply(request: DevSleepRecoveryRequest): Promise<DevSleepBenefitCommit> {
    return this.transactions.commitSleepBenefit(request, current => this.policy.decide(request, current));
  }
}
