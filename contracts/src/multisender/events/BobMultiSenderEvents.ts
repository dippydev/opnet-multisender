import {
    Address,
    ADDRESS_BYTE_LENGTH,
    BytesWriter,
    NetEvent,
    U256_BYTE_LENGTH,
} from '@btc-vision/btc-runtime/runtime';
import { u256 } from '@btc-vision/as-bignum/assembly';

@final
export class MultiSendExecutedEvent extends NetEvent {
    constructor(
        sender: Address,
        token: Address,
        totalAmount: u256,
        recipientCount: u256,
        feeAmount: u256,
    ) {
        const data: BytesWriter = new BytesWriter(
            ADDRESS_BYTE_LENGTH +
                ADDRESS_BYTE_LENGTH +
                U256_BYTE_LENGTH +
                U256_BYTE_LENGTH +
                U256_BYTE_LENGTH,
        );
        data.writeAddress(sender);
        data.writeAddress(token);
        data.writeU256(totalAmount);
        data.writeU256(recipientCount);
        data.writeU256(feeAmount);
        super('MultiSendExecuted', data);
    }
}

@final
export class OwnershipTransferredEvent extends NetEvent {
    constructor(previousOwner: Address, newOwner: Address) {
        const data: BytesWriter = new BytesWriter(ADDRESS_BYTE_LENGTH + ADDRESS_BYTE_LENGTH);
        data.writeAddress(previousOwner);
        data.writeAddress(newOwner);
        super('OwnershipTransferred', data);
    }
}

@final
export class FeeUpdatedEvent extends NetEvent {
    constructor(newFeeBps: u256) {
        const data: BytesWriter = new BytesWriter(U256_BYTE_LENGTH);
        data.writeU256(newFeeBps);
        super('FeeUpdated', data);
    }
}

@final
export class TreasuryUpdatedEvent extends NetEvent {
    constructor(newTreasury: Address) {
        const data: BytesWriter = new BytesWriter(ADDRESS_BYTE_LENGTH);
        data.writeAddress(newTreasury);
        super('TreasuryUpdated', data);
    }
}

@final
export class PausedEvent extends NetEvent {
    constructor() {
        const data: BytesWriter = new BytesWriter(0);
        super('Paused', data);
    }
}

@final
export class UnpausedEvent extends NetEvent {
    constructor() {
        const data: BytesWriter = new BytesWriter(0);
        super('Unpaused', data);
    }
}
