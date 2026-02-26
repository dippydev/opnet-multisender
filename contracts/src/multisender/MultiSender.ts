import { u256 } from '@btc-vision/as-bignum/assembly';
import {
    Address,
    ADDRESS_BYTE_LENGTH,
    Blockchain,
    BytesWriter,
    Calldata,
    EMPTY_POINTER,
    ReentrancyGuard,
    Revert,
    SafeMath,
    StoredAddress,
    StoredU256,
    TransferHelper,
    U256_BYTE_LENGTH,
} from '@btc-vision/btc-runtime/runtime';

import {
    FeeUpdatedEvent,
    MultiSendExecutedEvent,
    OwnershipTransferredEvent,
    PausedEvent,
    UnpausedEvent,
} from './events/MultiSenderEvents';

// Storage pointers (allocated after ReentrancyGuard's 2 via auto-increment)
const ownerPointer: u16 = Blockchain.nextPointer;
const feePointer: u16 = Blockchain.nextPointer;
const pausedPointer: u16 = Blockchain.nextPointer;
const treasuryPointer: u16 = Blockchain.nextPointer;

@final
export class MultiSender extends ReentrancyGuard {
    // Storage fields — initialized at declaration, values set in onDeployment
    private _owner: StoredAddress = new StoredAddress(ownerPointer);
    private _fee: StoredU256 = new StoredU256(feePointer, EMPTY_POINTER);
    private _paused: StoredU256 = new StoredU256(pausedPointer, EMPTY_POINTER);
    private _treasury: StoredAddress = new StoredAddress(treasuryPointer);

    public constructor() {
        super();
    }

    public override onDeployment(_calldata: Calldata): void {
        this._owner.value = Blockchain.tx.sender;
        this._treasury.value = Blockchain.tx.sender;
        this._fee.value = u256.Zero;
        this._paused.value = u256.Zero;
    }

    public override onUpdate(_calldata: Calldata): void {
        this.onlyDeployer(Blockchain.tx.sender);
    }

    // ================================================================
    // ADMIN METHODS
    // ================================================================

    @method({ name: 'newOwner', type: ABIDataTypes.ADDRESS })
    public transferOwnership(calldata: Calldata): BytesWriter {
        this._onlyOwner();
        const newOwner: Address = calldata.readAddress();
        const previousOwner: Address = this._owner.value;
        this._owner.value = newOwner;
        this.emitEvent(new OwnershipTransferredEvent(previousOwner, newOwner));
        return new BytesWriter(0);
    }

    @method()
    public pause(_calldata: Calldata): BytesWriter {
        this._onlyOwner();
        if (this._isPaused()) throw new Revert('Already paused');
        this._paused.value = u256.One;
        this.emitEvent(new PausedEvent());
        return new BytesWriter(0);
    }

    @method()
    public unpause(_calldata: Calldata): BytesWriter {
        this._onlyOwner();
        if (!this._isPaused()) throw new Revert('Not paused');
        this._paused.value = u256.Zero;
        this.emitEvent(new UnpausedEvent());
        return new BytesWriter(0);
    }

    @method({ name: 'fee', type: ABIDataTypes.UINT256 })
    public setFee(calldata: Calldata): BytesWriter {
        this._onlyOwner();
        const newFee: u256 = calldata.readU256();
        this._fee.value = newFee;
        this.emitEvent(new FeeUpdatedEvent(newFee));
        return new BytesWriter(0);
    }

    // ================================================================
    // CORE METHODS
    // ================================================================

    @method(
        { name: 'token', type: ABIDataTypes.ADDRESS },
        { name: 'recipients', type: ABIDataTypes.ARRAY_OF_ADDRESSES },
        { name: 'amounts', type: ABIDataTypes.ARRAY_OF_UINT256 },
    )
    public multiSend(calldata: Calldata): BytesWriter {
        this._requireNotPaused();

        const token: Address = calldata.readAddress();
        const recipients: Address[] = calldata.readAddressArray();
        const amounts: u256[] = calldata.readU256Array();

        const recipientCount: i32 = recipients.length;

        if (recipientCount === 0) {
            throw new Revert('Empty recipients');
        }

        if (recipientCount !== amounts.length) {
            throw new Revert('Array length mismatch');
        }

        if (recipientCount > 100) {
            throw new Revert('Max 100 recipients');
        }

        const sender: Address = Blockchain.tx.sender;
        let totalAmount: u256 = u256.Zero;

        for (let i: i32 = 0; i < recipientCount; i++) {
            totalAmount = SafeMath.add(totalAmount, amounts[i]);

            // Cross-contract transferFrom — reverts on failure
            TransferHelper.transferFrom(token, sender, recipients[i], amounts[i]);
        }

        this.emitEvent(
            new MultiSendExecutedEvent(
                sender,
                token,
                totalAmount,
                u256.fromU64(<u64>recipientCount),
            ),
        );

        return new BytesWriter(0);
    }

    @method(
        { name: 'token', type: ABIDataTypes.ADDRESS },
        { name: 'recipients', type: ABIDataTypes.ARRAY_OF_ADDRESSES },
        { name: 'amountEach', type: ABIDataTypes.UINT256 },
    )
    public multiSendEqual(calldata: Calldata): BytesWriter {
        this._requireNotPaused();

        const token: Address = calldata.readAddress();
        const recipients: Address[] = calldata.readAddressArray();
        const amountEach: u256 = calldata.readU256();

        const recipientCount: i32 = recipients.length;

        if (recipientCount === 0) {
            throw new Revert('Empty recipients');
        }

        if (recipientCount > 100) {
            throw new Revert('Max 100 recipients');
        }

        const sender: Address = Blockchain.tx.sender;
        const totalAmount: u256 = SafeMath.mul(
            amountEach,
            u256.fromU64(<u64>recipientCount),
        );

        for (let i: i32 = 0; i < recipientCount; i++) {
            TransferHelper.transferFrom(token, sender, recipients[i], amountEach);
        }

        this.emitEvent(
            new MultiSendExecutedEvent(
                sender,
                token,
                totalAmount,
                u256.fromU64(<u64>recipientCount),
            ),
        );

        return new BytesWriter(0);
    }

    // ================================================================
    // VIEW METHODS
    // ================================================================

    @method()
    @returns({ name: 'owner', type: ABIDataTypes.ADDRESS })
    public getOwner(_calldata: Calldata): BytesWriter {
        const w: BytesWriter = new BytesWriter(ADDRESS_BYTE_LENGTH);
        w.writeAddress(this._owner.value);
        return w;
    }

    @method()
    @returns({ name: 'fee', type: ABIDataTypes.UINT256 })
    public getFee(_calldata: Calldata): BytesWriter {
        const w: BytesWriter = new BytesWriter(U256_BYTE_LENGTH);
        w.writeU256(this._fee.value);
        return w;
    }

    @method()
    @returns({ name: 'paused', type: ABIDataTypes.BOOL })
    public isPaused(_calldata: Calldata): BytesWriter {
        const w: BytesWriter = new BytesWriter(1);
        w.writeBoolean(this._isPaused());
        return w;
    }

    // ================================================================
    // INTERNAL HELPERS
    // ================================================================

    protected _onlyOwner(): void {
        if (Blockchain.tx.sender !== this._owner.value) {
            throw new Revert('Not owner');
        }
    }

    protected _isPaused(): bool {
        return this._paused.value !== u256.Zero;
    }

    protected _requireNotPaused(): void {
        if (this._isPaused()) {
            throw new Revert('Contract is paused');
        }
    }
}
