# OPNet MultiSender

Batch-send OP20 tokens and native BTC to hundreds of addresses in a single flow on Bitcoin L1 via OPNet.

Built for the [vibecode.finance](https://vibecode.finance) OP_NET Vibecoding Challenge.

## Features

- **OP20 Token MultiSend** — batch-send any OP20 token via smart contract with cross-contract `transferFrom`
- **Native BTC MultiSend** — send tBTC to multiple addresses (frontend-only, no contract needed)
- **Three Input Methods** — manual entry, CSV upload, or paste
- **Auto-Batching** — splits >100 recipients into multiple contract calls automatically
- **Approval Flow** — `increaseAllowance` before `multiSend`
- **Distribution Modes** — custom amounts, equal split (airdrop), or percentage-based
- **Dry Run Simulation** — simulate before sending to catch reverts early
- **Gas Estimator** — estimated transaction fees shown before sending
- **Multi-Token Queue** — queue sends for different tokens in one session
- **Address Book** — save frequently used addresses with labels
- **Saved Recipient Lists** — save and reload recipient lists
- **Scheduled Sends** — plan future distributions with reminders
- **Export Receipts** — download CSV receipts of completed sends
- **QR Code Import** — scan QR codes to add recipient addresses
- **Analytics Dashboard** — charts for sends over time, most-used tokens, recipient frequency
- **Dark/Light Mode** — toggle with persistent preference
- **i18n** — English and Spanish with language selector
- **Mobile Responsive** — works at 375px+ with hamburger menu and card layouts

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | AssemblyScript → WASM (`@btc-vision/btc-runtime`, `ReentrancyGuard`) |
| Frontend | React 19 + TypeScript + Vite 6 + Tailwind CSS v4 |
| Backend | hyper-express + TypeScript + better-sqlite3 |
| Wallet | OP_WALLET via `@btc-vision/walletconnect` |
| OPNet Client | `opnet@rc` |
| Network | OPNet Testnet (`networks.opnetTestnet`) |

## Project Structure

```
multisender/
  contracts/     — AssemblyScript smart contract (own package.json)
  scripts/       — Deploy + admin scripts (own package.json)
  frontend/      — React + Vite app (own package.json)
  server/        — hyper-express backend (own package.json)
```

Each sub-folder is its own npm project. No workspaces — install each separately.

## Setup

### Prerequisites

- Node.js 22+
- An OPNet-compatible wallet (OP_WALLET browser extension)
- A funded OPNet testnet wallet (for deployment)

### 1. Smart Contract

```bash
cd contracts
npm install
npm run build
```

Compiles `MultiSender.ts` to `build/MultiSender.wasm`.

### 2. Deploy Contract (requires funded wallet)

```bash
cd scripts
npm install
cp ../../.env.example ../../.env
# Edit .env with your WIF_PRIVATE_KEY and MNEMONIC
npx tsx src/deploy.ts
```

After deployment, the contract address is saved to `scripts/src/addresses.json`.

### 3. Admin Scripts

```bash
cd scripts
npx tsx src/interact.ts --help          # Show available commands
npx tsx src/interact.ts --get-owner     # Check contract owner
npx tsx src/interact.ts --is-paused     # Check pause status
npx tsx src/interact.ts --set-fee 0     # Set fee (in smallest unit)
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`. Update `MULTISENDER_CONTRACT_ADDRESS` in `src/config/constants.ts` with your deployed contract address.

### 5. Backend

```bash
cd server
npm install
npm run dev
```

Starts API server at `http://localhost:3001`. Endpoints:

- `GET /health` — health check
- `GET /api/tokens` — cached token list
- `POST /api/history` — save multisend record
- `GET /api/history/:address` — get history for wallet
- `POST /api/csv/validate` — server-side CSV validation

### Environment Variables

Create a `.env` file in the project root:

```
WIF_PRIVATE_KEY=your_wif_key_here
MNEMONIC=your twelve word mnemonic phrase here
```

Frontend uses `VITE_API_BASE_URL` (defaults to `http://localhost:3001`).
Server uses `FRONTEND_URL` (defaults to `http://localhost:5173`), `PORT` (defaults to `3001`), `DB_PATH`.

## Deployment (Railway)

Both frontend and server include Dockerfiles and `railway.toml` for Railway deployment.

### Frontend

```bash
cd frontend
# docker build --build-arg VITE_API_BASE_URL=https://your-api.railway.app -t multisender-frontend .
```

### Server

```bash
cd server
# docker build -t multisender-server .
```

## How It Works

### OP20 Token Mode

1. User connects OP_WALLET
2. Selects an OP20 token (from known list or custom address)
3. Enters recipients (manual, CSV, paste, QR scan, address book)
4. Reviews summary — sees batch count, gas estimate, simulation results
5. Approves token allowance (`increaseAllowance` for MultiSender contract)
6. Sends — frontend auto-batches into groups of 100, calls `multiSend` or `multiSendEqual` per batch
7. Views transaction status with OPScan links

### BTC Mode

1. Same flow but selects "BTC (Native)" as token
2. No contract interaction — uses `TransactionFactory.createBTCTransfer` per recipient
3. Sequential sends with UTXO chaining between transfers

## Contract Design

- Extends `ReentrancyGuard` (utility contract, not OP20)
- Cross-contract `transferFrom` via `TransferHelper.transferFrom(token, sender, recipient, amount)`
- Owner-controlled: pause/unpause, fee management, ownership transfer
- Fee defaults to 0 (free), scaffolded for future activation
- Max 100 recipients per call
- Two send methods: `multiSend` (variable amounts) and `multiSendEqual` (same amount each)

## License

MIT
