export const EBO_SUPPORTED_CHAINS_CONFIG = {
    evm: {
        namespace: "eip155",
        references: {
            ethereum: "1",
            polygon: "137",
            arbitrum: "42161",
        },
    },
    solana: {
        namespace: "solana",
        references: {
            mainnet: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
        },
    },
} as const;

export const EBO_SUPPORTED_CHAIN_IDS = Object.values(EBO_SUPPORTED_CHAINS_CONFIG).reduce(
    (acc, namespace) => {
        const namespaceReferences = Object.values(namespace.references);
        const chainIds = namespaceReferences.map(
            (reference) => `${namespace.namespace}:${reference}`,
        );

        return [...acc, ...chainIds];
    },
    [] as string[],
);
