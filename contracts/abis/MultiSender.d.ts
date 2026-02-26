import { Address, AddressMap, ExtendedAddressMap, SchnorrSignature } from '@btc-vision/transaction';
import { CallResult, OPNetEvent, IOP_NETContract } from 'opnet';

// ------------------------------------------------------------------
// Event Definitions
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Call Results
// ------------------------------------------------------------------

/**
 * @description Represents the result of the transferOwnership function call.
 */
export type TransferOwnership = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the pause function call.
 */
export type Pause = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the unpause function call.
 */
export type Unpause = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the setFee function call.
 */
export type SetFee = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the multiSend function call.
 */
export type MultiSend = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the multiSendEqual function call.
 */
export type MultiSendEqual = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the getOwner function call.
 */
export type GetOwner = CallResult<
    {
        owner: Address;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getFee function call.
 */
export type GetFee = CallResult<
    {
        fee: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the isPaused function call.
 */
export type IsPaused = CallResult<
    {
        paused: boolean;
    },
    OPNetEvent<never>[]
>;

// ------------------------------------------------------------------
// IMultiSender
// ------------------------------------------------------------------
export interface IMultiSender extends IOP_NETContract {
    transferOwnership(newOwner: Address): Promise<TransferOwnership>;
    pause(): Promise<Pause>;
    unpause(): Promise<Unpause>;
    setFee(fee: bigint): Promise<SetFee>;
    multiSend(token: Address, recipients: Address[], amounts: bigint[]): Promise<MultiSend>;
    multiSendEqual(token: Address, recipients: Address[], amountEach: bigint): Promise<MultiSendEqual>;
    getOwner(): Promise<GetOwner>;
    getFee(): Promise<GetFee>;
    isPaused(): Promise<IsPaused>;
}
