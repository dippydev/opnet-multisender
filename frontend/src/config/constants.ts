export const MULTISENDER_CONTRACT_ADDRESS =
  import.meta.env.VITE_MULTISENDER_CONTRACT || '';

export const RPC_URL =
  import.meta.env.VITE_RPC_URL || 'https://testnet.opnet.org';

export const OPSCAN_BASE_URL = 'https://opscan.org';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const MAX_RECIPIENTS_PER_BATCH = 100;

// PILL token gate
export const PILL_TOKEN_ADDRESS =
  'opt1sqp5gx9k0nrqph3sy3aeyzt673dz7ygtqxcfdqfle';
export const PILL_REQUIRED_AMOUNT = 10_000;
export const PILL_DECIMALS = 18;

// MotoSwap
export const MOTOSWAP_URL = 'https://motoswap.org';

export interface KnownToken {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
}

export const KNOWN_TOKENS: KnownToken[] = [
  {
    address:
      'opt1pens94hp3gqk2grgz275e58dquuuv5qmf6fgkm7q3exynykvlx8s65aj56',
    name: 'MOTO',
    symbol: 'MOTO',
    decimals: 18,
  },
  {
    address:
      'opt1pyvcyjmgq6asnr45dcr4wvqwkl9z3h78e2cxuqqde2s05jvgaw0savmj3h',
    name: 'Wasabi',
    symbol: 'WABI',
    decimals: 18,
  },
  {
    address: 'opt1sqp5gx9k0nrqph3sy3aeyzt673dz7ygtqxcfdqfle',
    name: 'PILL',
    symbol: 'PILL',
    decimals: 18,
  },
];
