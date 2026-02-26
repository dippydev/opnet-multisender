import {
  ABIDataTypes,
  BitcoinAbiTypes,
  OP_NET_ABI,
  type CallResult,
  type IOP_NETContract,
  type BitcoinInterfaceAbi,
} from 'opnet';
import type { Address } from '@btc-vision/transaction';

// ------------------------------------------------------------------
// ABI (mirrored from contracts/abis/multisender/MultiSender.abi.ts)
// ------------------------------------------------------------------

const MultiSenderEvents: BitcoinInterfaceAbi = [
  {
    name: 'MultiSendExecuted',
    values: [
      { name: 'sender', type: ABIDataTypes.ADDRESS },
      { name: 'token', type: ABIDataTypes.ADDRESS },
      { name: 'totalAmount', type: ABIDataTypes.UINT256 },
      { name: 'recipientCount', type: ABIDataTypes.UINT256 },
    ],
    type: BitcoinAbiTypes.Event,
  },
  {
    name: 'OwnershipTransferred',
    values: [
      { name: 'previousOwner', type: ABIDataTypes.ADDRESS },
      { name: 'newOwner', type: ABIDataTypes.ADDRESS },
    ],
    type: BitcoinAbiTypes.Event,
  },
  {
    name: 'FeeUpdated',
    values: [{ name: 'newFee', type: ABIDataTypes.UINT256 }],
    type: BitcoinAbiTypes.Event,
  },
  {
    name: 'Paused',
    values: [],
    type: BitcoinAbiTypes.Event,
  },
  {
    name: 'Unpaused',
    values: [],
    type: BitcoinAbiTypes.Event,
  },
];

export const MultiSenderAbi: BitcoinInterfaceAbi = [
  {
    name: 'multiSend',
    inputs: [
      { name: 'token', type: ABIDataTypes.ADDRESS },
      { name: 'recipients', type: ABIDataTypes.ARRAY_OF_ADDRESSES },
      { name: 'amounts', type: ABIDataTypes.ARRAY_OF_UINT256 },
    ],
    outputs: [],
    type: BitcoinAbiTypes.Function,
  },
  {
    name: 'multiSendEqual',
    inputs: [
      { name: 'token', type: ABIDataTypes.ADDRESS },
      { name: 'recipients', type: ABIDataTypes.ARRAY_OF_ADDRESSES },
      { name: 'amountEach', type: ABIDataTypes.UINT256 },
    ],
    outputs: [],
    type: BitcoinAbiTypes.Function,
  },
  {
    name: 'setFee',
    inputs: [{ name: 'fee', type: ABIDataTypes.UINT256 }],
    outputs: [],
    type: BitcoinAbiTypes.Function,
  },
  {
    name: 'getFee',
    inputs: [],
    outputs: [{ name: 'fee', type: ABIDataTypes.UINT256 }],
    type: BitcoinAbiTypes.Function,
  },
  {
    name: 'getOwner',
    inputs: [],
    outputs: [{ name: 'owner', type: ABIDataTypes.ADDRESS }],
    type: BitcoinAbiTypes.Function,
  },
  {
    name: 'isPaused',
    inputs: [],
    outputs: [{ name: 'paused', type: ABIDataTypes.BOOL }],
    type: BitcoinAbiTypes.Function,
  },
  {
    name: 'pause',
    inputs: [],
    outputs: [],
    type: BitcoinAbiTypes.Function,
  },
  {
    name: 'unpause',
    inputs: [],
    outputs: [],
    type: BitcoinAbiTypes.Function,
  },
  {
    name: 'transferOwnership',
    inputs: [{ name: 'newOwner', type: ABIDataTypes.ADDRESS }],
    outputs: [],
    type: BitcoinAbiTypes.Function,
  },
  ...MultiSenderEvents,
  ...OP_NET_ABI,
];

// ------------------------------------------------------------------
// Interface (mirrored from contracts/abis/multisender/MultiSender.d.ts)
// ------------------------------------------------------------------

export type MultiSend = CallResult;
export type MultiSendEqual = CallResult;

export interface IMultiSender extends IOP_NETContract {
  multiSend(
    token: Address,
    recipients: Address[],
    amounts: bigint[],
  ): Promise<MultiSend>;
  multiSendEqual(
    token: Address,
    recipients: Address[],
    amountEach: bigint,
  ): Promise<MultiSendEqual>;
}
