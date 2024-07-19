// Based on https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md

type ChainNamespace = string;
type ChainReference = string;

interface ChainIdParams {
    namespace: ChainNamespace;
    reference: ChainReference;
}

const NAMESPACE_FORMAT = /^[-a-z0-9]{3,8}$/;
const REFERENCE_FORMAT = /^[-_a-zA-Z0-9]{1,32}$/;

export class InvalidChainId extends Error {
    constructor(message: string) {
        super(message);

        this.name = "InvalidChainId";
    }
}

export class ChainId {
    private namespace: string;
    private reference: string;

    /**
     * Creates a validated CAIP-2 compliant chain ID.
     *
     * @param chainId a CAIP-2 compliant string.
     */
    constructor(chainId: string) {
        const params = ChainId.parse(chainId);

        this.namespace = params.namespace;
        this.reference = params.reference;
    }

    /**
     * Parses a CAIP-2 compliant string.
     *
     * @param chainId {string} a CAIP-2 compliant string
     * @returns an object containing the namespace and the reference of the chain id
     */
    public static parse(chainId: string): ChainIdParams {
        const elements = chainId.split(":");

        if (elements.length !== 2) {
            throw new InvalidChainId("A CAIP-2 chain id should have exactly one colon.");
        }

        const [namespace, reference] = elements;

        if (namespace === undefined || reference === undefined) {
            throw new InvalidChainId("Both elements should be defined.");
        }

        const isValidNamespace = NAMESPACE_FORMAT.test(namespace);
        if (!isValidNamespace) throw new InvalidChainId("Chain ID namespace is not valid.");

        const isValidReference = REFERENCE_FORMAT.test(reference);
        if (!isValidReference) throw new InvalidChainId("Chain ID reference is not valid.");

        return {
            namespace,
            reference,
        };
    }

    public toString() {
        return `${this.namespace}:${this.reference}`;
    }
}
