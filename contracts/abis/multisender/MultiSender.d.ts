import { Address } from '@btc-vision/transaction';
import { CallResult, OPNetEvent, IOP_NETContract } from 'opnet';

// ------------------------------------------------------------------
// Call Results
// ------------------------------------------------------------------

export type MultiSend = CallResult<{}, OPNetEvent<never>[]>;

export type MultiSendEqual = CallResult<{}, OPNetEvent<never>[]>;

export type SetFee = CallResult<{}, OPNetEvent<never>[]>;

export type GetFee = CallResult<
    {
        fee: bigint;
    },
    OPNetEvent<never>[]
>;

export type GetOwner = CallResult<
    {
        owner: Address;
    },
    OPNetEvent<never>[]
>;

export type IsPaused = CallResult<
    {
        paused: boolean;
    },
    OPNetEvent<never>[]
>;

export type Pause = CallResult<{}, OPNetEvent<never>[]>;

export type Unpause = CallResult<{}, OPNetEvent<never>[]>;

export type TransferOwnership = CallResult<{}, OPNetEvent<never>[]>;

// ------------------------------------------------------------------
// IMultiSender
// ------------------------------------------------------------------
export interface IMultiSender extends IOP_NETContract {
    multiSend(token: Address, recipients: Address[], amounts: bigint[]): Promise<MultiSend>;
    multiSendEqual(token: Address, recipients: Address[], amountEach: bigint): Promise<MultiSendEqual>;
    setFee(fee: bigint): Promise<SetFee>;
    getFee(): Promise<GetFee>;
    getOwner(): Promise<GetOwner>;
    isPaused(): Promise<IsPaused>;
    pause(): Promise<Pause>;
    unpause(): Promise<Unpause>;
    transferOwnership(newOwner: Address): Promise<TransferOwnership>;
}
