import { Caip2ChainId } from "./types/index.js";

/** Supported chains on EBO organized by namespaces and their references */
export const EBO_SUPPORTED_CHAINS_CONFIG = {
    evm: {
        namespace: "eip155",
        references: {
            ethereum: "1",
            polygon: "137",
            arbitrum: "42161",
            arbitrumSepolia: "421614",
            arbitrumAnvil: "4216138",
        },
    },
    solana: {
        namespace: "solana",
        references: {
            mainnet: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
        },
    },
} as const;

/** Array of CAIP2 compliant chain IDs supported by EBO */
export const EBO_SUPPORTED_CHAIN_IDS = Object.values(EBO_SUPPORTED_CHAINS_CONFIG).reduce(
    (acc, namespace) => {
        const namespaceReferences = Object.values(namespace.references);
        const chainIds = namespaceReferences.map(
            (reference) => `${namespace.namespace}:${reference}` as Caip2ChainId,
        );

        return [...acc, ...chainIds];
    },
    [] as Caip2ChainId[],
);
