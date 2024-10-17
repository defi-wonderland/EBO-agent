# ebo-agent: shared package

Shared lib that for EBO agent libraries.

## Available Scripts

Available scripts that can be run using `pnpm`:

| Script       | Description                                             |
| ------------ | ------------------------------------------------------- |
| `build`      | Build library using tsc                                 |
| `clean`      | Remove `dist` folder                                    |
| `lint`       | Run ESLint to check for coding standards                |
| `lint:fix`   | Run linter and automatically fix code formatting issues |
| `format`     | Check code formatting and style using Prettier          |
| `format:fix` | Run formatter and automatically fix issues              |
| `test`       | Run tests using vitest                                  |
| `coverage`   | Run tests with coverage report                          |

## Usage

### Importing the Package

You can import the package in your TypeScript or JavaScript files as follows:

```typescript
import { HexUtils } from "@ebo-agent/shared";
```

### Example

```typescript
// EVM-provider
const normalizedHex = HexUtils.normalize("0x123ABC");

console.log(normalizedHex); // 0x123abc
```

## API

### [HexUtils](./src/services/hexUtils.ts)

Available methods

-   `normalize(address: string)`
-   `isNormalized(address: string)`

### [Caip2Utils](./src/services/caip2Utils.ts)

Available methods

-   `validateChainId(chainId: string)`
-   `isCaip2ChainId(chainId: string)`
-   `getNamespace(chainId: string | Caip2ChainId)`
-   `findByHash(hashedChainId: Hex, chainIds?: Caip2ChainId[])`

### [Logger](./src/services/logger.ts)

Available methods

-   `error(error: Error | string)`
-   `warn(message: string)`
-   `info(message: string)`
-   `debug(message: string)`

## References

-   [CAIP 2](https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md)
