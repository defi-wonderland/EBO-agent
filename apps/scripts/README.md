# EBO Agent Monorepo

This monorepo contains the EBO Agent scripts and packages.

## Setup

1. Install dependencies running `pnpm install`.

### Setting up environment variables

2. Create a `.env` file in apps/scripts and populate it with the required environment variables. See `.env.example` for reference.

```bash
cp .env.example .env
```

### Available Options

| Name                                | Description                                      | Required | Notes                                                                                                                                                                           |
| ----------------------------------- | ------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PRIVATE_KEY`                       | Private key of the agent operator                | Yes      |                                                                                                                                                                                 |
| `RPC_URLS_L1`                       | JSON array of L1 RPC URLs                        | Yes      | Example: `["https://mainnet.infura.io/v3/YOUR-PROJECT-ID"]`                                                                                                                     |
| `RPC_URLS_L2`                       | JSON array of L2 RPC URLs                        | Yes      | Example: `["https://arbitrum-mainnet.infura.io/v3/YOUR-PROJECT-ID"]`                                                                                                            |
| `TRANSACTION_RECEIPT_CONFIRMATIONS` | Number of confirmations for transaction receipts | No       | Defaults to `1`                                                                                                                                                                 |
| `TIMEOUT`                           | Timeout for RPC calls in milliseconds            | No       | Defaults to `30000` (30 sec)                                                                                                                                                    |
| `RETRY_INTERVAL`                    | Retry interval for RPC calls in milliseconds     | No       | Defaults to `1000` (1 sec)                                                                                                                                                      |
| `CONTRACTS_ADDRESSES`               | JSON object with contract addresses              | Yes      | Must include `l1ChainId`, `l2ChainId`, and contract addresses (e.g., `oracle`, `epochManager`, `eboRequestCreator`, `bondEscalationModule`, `horizonAccountingExtension`, etc.) |
| `BONDED_RESPONSE_MODULE_ADDRESS`    | Address of the Bonded Response Module            | Yes      |                                                                                                                                                                                 |
| `BOND_ESCALATION_MODULE_ADDRESS`    | Address of the Bond Escalation Module            | Yes      |                                                                                                                                                                                 |

### Available Scripts

Available scripts that can be run using pnpm:

| Script            | Description                                             |
| ----------------- | ------------------------------------------------------- |
| `build`           | Build library using tsc                                 |
| `check-types`     | Check type issues using tsc                             |
| `clean`           | Remove dist folder                                      |
| `lint`            | Run ESLint to check for coding standards                |
| `lint:fix`        | Run linter and automatically fix code formatting issues |
| `format`          | Check code formatting and style using Prettier          |
| `format:fix`      | Run formatter and automatically fix issues              |
| `test`            | Run tests using Vitest                                  |
| `test:cov`        | Run tests with coverage report                          |
| `approve-modules` | Run the approve modules script                          |

## Running the Approve Modules script

3. Run the script like this from the root of the repo or apps/scripts:

```bash
pnpm run approve-modules
```
