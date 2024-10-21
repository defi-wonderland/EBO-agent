# EBO Agent Monorepo

This monorepo contains the EBO Agent scripts and packages.

## Setup

1. Install dependencies running `pnpm install`.

### Setting up environment variables

Create a `.env` file in the root of the project and populate it with the required environment variables. See `.env.example` for reference.

```bash
cp .env.example .env
```

Here's the table converted into markdown:

### Available Options

| Name                                | Description                                      | Required | Notes                                                                                                                                                                           |
| ----------------------------------- | ------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PRIVATE_KEY`                       | Private key of the agent operator                | Yes      |                                                                                                                                                                                 |
| `RPC_URLS_L1`                       | JSON array of L1 RPC URLs                        | Yes      | Example: `["https://mainnet.infura.io/v3/YOUR-PROJECT-ID"]`                                                                                                                     |
| `RPC_URLS_L2`                       | JSON array of L2 RPC URLs                        | Yes      | Example: `["https://arbitrum-mainnet.infura.io/v3/YOUR-PROJECT-ID"]`                                                                                                            |
| `TRANSACTION_RECEIPT_CONFIRMATIONS` | Number of confirmations for transaction receipts | No       | Defaults to `1`                                                                                                                                                                 |
| `TIMEOUT`                           | Timeout for RPC calls in milliseconds            | No       | Defaults to `30000`                                                                                                                                                             |
| `RETRY_INTERVAL`                    | Retry interval for RPC calls in milliseconds     | No       | Defaults to `1000`                                                                                                                                                              |
| `CONTRACTS_ADDRESSES`               | JSON object with contract addresses              | Yes      | Must include `l1ChainId`, `l2ChainId`, and contract addresses (e.g., `oracle`, `epochManager`, `eboRequestCreator`, `bondEscalationModule`, `horizonAccountingExtension`, etc.) |
| `EBO_REQUEST_MODULE_ADDRESS`        | Address of the EBO Request Module                | Yes      |                                                                                                                                                                                 |
| `BONDED_RESPONSE_MODULE_ADDRESS`    | Address of the Bonded Response Module            | Yes      |                                                                                                                                                                                 |
| `BOND_ESCALATION_MODULE_ADDRESS`    | Address of the Bond Escalation Module            | Yes      |                                                                                                                                                                                 |

### Available Scripts

Available scripts that can be run using pnpm:

| Script                        | Description                                             |
| ----------------------------- | ------------------------------------------------------- |
| `build`                       | Build library using tsc                                 |
| `check-types`                 | Check type issues using tsc                             |
| `clean`                       | Remove dist folder                                      |
| `lint`                        | Run ESLint to check for coding standards                |
| `lint:fix`                    | Run linter and automatically fix code formatting issues |
| `format`                      | Check code formatting and style using Prettier          |
| `format:fix`                  | Run formatter and automatically fix issues              |
| `start`                       | Run the app                                             |
| `test`                        | Run tests using Vitest                                  |
| `test:cov`                    | Run tests with coverage report                          |
| `script:util:approve-modules` | Run the approve modules script                          |
