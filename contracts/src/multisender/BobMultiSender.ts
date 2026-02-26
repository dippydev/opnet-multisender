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
    StoredBoolean,
    StoredU256,
    TransferHelper,
    U256_BYTE_LENGTH,
} from '@btc-vision/btc-runtime/runtime';

import {
    FeeUpdatedEvent,
    MultiSendExecutedEvent,
    OwnershipTransferredEvent,
    PausedEvent,
    TreasuryUpdatedEvent,
    UnpausedEvent,
} from './events/BobMultiSenderEvents';

// ================================================================
// CONSTANTS
// ================================================================

/** Maximum recipients per call — bounded loop safety */
const MAX_RECIPIENTS: i32 = 100;

/** Fee denominator: 10_000 = 100%, so 1 bps = 0.01% */
const FEE_DENOMINATOR: u256 = u256.fromU64(10_000);

/** Maximum fee in basis points (5% = 500 bps) — prevents owner from setting abusive fees */
const MAX_FEE_BPS: u256 = u256.fromU64(500);

// ================================================================
// STORAGE POINTERS — auto-allocated via Blockchain.nextPointer
// ReentrancyGuard reserves the first 2 pointers internally.
// ================================================================

const ownerPointer: u16 = Blockchain.nextPointer;
const feePointer: u16 = Blockchain.nextPointer;
const pausedPointer: u16 = Blockchain.nextPointer;
const treasuryPointer: u16 = Blockchain.nextPointer;

// ================================================================
// CONTRACT
// ================================================================

@final
export class BobMultiSender extends ReentrancyGuard {
    // ----------------------------------------------------------------
    // Storage fields — initialized at declaration (TS2564 rule)
    // ----------------------------------------------------------------

    /** Contract owner — can manage admin functions */
    private readonly _owner: StoredAddress = new StoredAddress(ownerPointer);

    /** Fee rate in basis points (0–500). 0 = no fee. */
    private readonly _feeBps: StoredU256 = new StoredU256(feePointer, EMPTY_POINTER);

    /** Pause flag — when true, all core methods revert */
    private readonly _paused: StoredBoolean = new StoredBoolean(pausedPointer, false);

    /** Treasury address — receives collected fees */
    private readonly _treasury: StoredAddress = new StoredAddress(treasuryPointer);

    // ----------------------------------------------------------------
    // Constructor — runs on EVERY interaction
    // ----------------------------------------------------------------

    public constructor() {
        super();
    }

    // ----------------------------------------------------------------
    // Lifecycle
    // ----------------------------------------------------------------

    /** Runs ONCE on first deployment — initialize storage here */
    public override onDeployment(_calldata: Calldata): void {
        const deployer: Address = Blockchain.tx.sender;
        this._owner.value = deployer;
        this._treasury.value = deployer;
        this._feeBps.value = u256.Zero; // No fee by default
        this._paused.value = false;
    }

    /** Mandatory — runs on contract upgrade */
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

        if (this._paused.value) {
            throw new Revert('Already paused');
        }

        this._paused.value = true;

        this.emitEvent(new PausedEvent());

        return new BytesWriter(0);
    }

    @method()
    public unpause(_calldata: Calldata): BytesWriter {
        this._onlyOwner();

        if (!this._paused.value) {
            throw new Revert('Not paused');
        }

        this._paused.value = false;

        this.emitEvent(new UnpausedEvent());

        return new BytesWriter(0);
    }

    @method({ name: 'feeBps', type: ABIDataTypes.UINT256 })
    public setFee(calldata: Calldata): BytesWriter {
        this._onlyOwner();

        const newFeeBps: u256 = calldata.readU256();

        if (u256.gt(newFeeBps, MAX_FEE_BPS)) {
            throw new Revert('Fee exceeds maximum');
        }

        this._feeBps.value = newFeeBps;

        this.emitEvent(new FeeUpdatedEvent(newFeeBps));

        return new BytesWriter(0);
    }

    @method({ name: 'newTreasury', type: ABIDataTypes.ADDRESS })
    public setTreasury(calldata: Calldata): BytesWriter {
        this._onlyOwner();

        const newTreasury: Address = calldata.readAddress();

        this._treasury.value = newTreasury;

        this.emitEvent(new TreasuryUpdatedEvent(newTreasury));

        return new BytesWriter(0);
    }

    // ================================================================
    // CORE METHODS
    // ================================================================

    /**
     * Send variable amounts of a token to multiple recipients.
     * Caller must have approved this contract for totalAmount + fee.
     */
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

        // --- Validation ---
        if (recipientCount === 0) {
            throw new Revert('Empty recipients');
        }

        if (recipientCount !== amounts.length) {
            throw new Revert('Array length mismatch');
        }

        if (recipientCount > MAX_RECIPIENTS) {
            throw new Revert('Max 100 recipients');
        }

        const sender: Address = Blockchain.tx.sender;

        // --- Calculate total ---
        let totalAmount: u256 = u256.Zero;
        for (let i: i32 = 0; i < recipientCount; i++) {
            totalAmount = SafeMath.add(totalAmount, amounts[i]);
        }

        // --- Collect fee (checks-effects-interactions: fee first) ---
        const feeAmount: u256 = this._collectFee(token, sender, totalAmount);

        // --- Execute transfers ---
        for (let i: i32 = 0; i < recipientCount; i++) {
            TransferHelper.transferFrom(token, sender, recipients[i], amounts[i]);
        }

        // --- Emit event ---
        this.emitEvent(
            new MultiSendExecutedEvent(
                sender,
                token,
                totalAmount,
                u256.fromU64(<u64>recipientCount),
                feeAmount,
            ),
        );

        return new BytesWriter(0);
    }

    /**
     * Send equal amounts of a token to multiple recipients.
     * Caller must have approved this contract for (amountEach * count) + fee.
     */
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

        // --- Validation ---
        if (recipientCount === 0) {
            throw new Revert('Empty recipients');
        }

        if (recipientCount > MAX_RECIPIENTS) {
            throw new Revert('Max 100 recipients');
        }

        const sender: Address = Blockchain.tx.sender;
        const totalAmount: u256 = SafeMath.mul(
            amountEach,
            u256.fromU64(<u64>recipientCount),
        );

        // --- Collect fee (checks-effects-interactions: fee first) ---
        const feeAmount: u256 = this._collectFee(token, sender, totalAmount);

        // --- Execute transfers ---
        for (let i: i32 = 0; i < recipientCount; i++) {
            TransferHelper.transferFrom(token, sender, recipients[i], amountEach);
        }

        // --- Emit event ---
        this.emitEvent(
            new MultiSendExecutedEvent(
                sender,
                token,
                totalAmount,
                u256.fromU64(<u64>recipientCount),
                feeAmount,
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
    @returns({ name: 'feeBps', type: ABIDataTypes.UINT256 })
    public getFee(_calldata: Calldata): BytesWriter {
        const w: BytesWriter = new BytesWriter(U256_BYTE_LENGTH);
        w.writeU256(this._feeBps.value);
        return w;
    }

    @method()
    @returns({ name: 'paused', type: ABIDataTypes.BOOL })
    public isPaused(_calldata: Calldata): BytesWriter {
        const w: BytesWriter = new BytesWriter(1);
        w.writeBoolean(this._paused.value);
        return w;
    }

    @method()
    @returns({ name: 'treasury', type: ABIDataTypes.ADDRESS })
    public getTreasury(_calldata: Calldata): BytesWriter {
        const w: BytesWriter = new BytesWriter(ADDRESS_BYTE_LENGTH);
        w.writeAddress(this._treasury.value);
        return w;
    }

    // ================================================================
    // INTERNAL HELPERS
    // ================================================================

    /** Revert if caller is not the owner */
    protected _onlyOwner(): void {
        if (Blockchain.tx.sender !== this._owner.value) {
            throw new Revert('Not owner');
        }
    }

    /** Revert if contract is paused */
    protected _requireNotPaused(): void {
        if (this._paused.value) {
            throw new Revert('Contract is paused');
        }
    }

    /**
     * Calculate and collect the fee from sender → treasury.
     * Fee = totalAmount * feeBps / 10_000.
     * Returns the fee amount collected (u256.Zero if no fee).
     */
    protected _collectFee(token: Address, sender: Address, totalAmount: u256): u256 {
        const feeBps: u256 = this._feeBps.value;

        if (u256.eq(feeBps, u256.Zero)) {
            return u256.Zero;
        }

        // feeAmount = totalAmount * feeBps / FEE_DENOMINATOR
        const feeAmount: u256 = SafeMath.div(
            SafeMath.mul(totalAmount, feeBps),
            FEE_DENOMINATOR,
        );

        if (u256.eq(feeAmount, u256.Zero)) {
            return u256.Zero;
        }

        // Transfer fee from sender to treasury
        TransferHelper.transferFrom(token, sender, this._treasury.value, feeAmount);

        return feeAmount;
    }
}
