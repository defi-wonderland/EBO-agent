export const supportedChains = {
    evm: {
        namespace: "eip155",
        chains: {
            ethereum: "eip155:1",
            polygon: "eip155:137",
            arbitrum: "eip155:42161",
        },
    },
} as const;
