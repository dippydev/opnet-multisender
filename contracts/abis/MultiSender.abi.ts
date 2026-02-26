import { ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } from 'opnet';

export const MultiSenderEvents = [];

export const MultiSenderAbi = [
    {
        name: 'transferOwnership',
        inputs: [{ name: 'newOwner', type: ABIDataTypes.ADDRESS }],
        outputs: [],
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
        name: 'setFee',
        inputs: [{ name: 'fee', type: ABIDataTypes.UINT256 }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
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
        name: 'getOwner',
        inputs: [],
        outputs: [{ name: 'owner', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getFee',
        inputs: [],
        outputs: [{ name: 'fee', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'isPaused',
        inputs: [],
        outputs: [{ name: 'paused', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    ...MultiSenderEvents,
    ...OP_NET_ABI,
];

export default MultiSenderAbi;
