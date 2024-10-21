// Based on https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md

import { Hex, keccak256, toHex } from "viem";

import { EBO_SUPPORTED_CHAIN_IDS } from "../constants.js";
import { InvalidChainId } from "../exceptions/index.js";
import { Caip2ChainId } from "../types/index.js";

const NAMESPACE_FORMAT = /^[-a-z0-9]{3,8}$/;
const REFERENCE_FORMAT = /^[-_a-zA-Z0-9]{1,32}$/;

export class Caip2Utils {
    private static DEFAULT_SUPPORTED_CHAINS_HASHES: Record<Hex, Caip2ChainId> =
        EBO_SUPPORTED_CHAIN_IDS.reduce(
            (prev, curr) => {
                const hash = keccak256(toHex(curr)).toLowerCase() as Hex;

                prev[hash] = curr;

                return prev;
            },
            {} as Record<Hex, Caip2ChainId>,
        );

    /**
     * Parses a CAIP-2 compliant string.
     *
     * @param chainId {string} a CAIP-2 compliant string
     * @returns the CAIP-2 validated chain id string
     */
    public static validateChainId(chainId: string): chainId is Caip2ChainId {
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

        return true;
    }

    public static isCaip2ChainId(chainId: string): chainId is Caip2ChainId {
        try {
            this.validateChainId(chainId);

            return true;
        } catch (err) {
            return false;
        }
    }

    public static getNamespace(chainId: string | Caip2ChainId) {
        this.validateChainId(chainId);

        const namespace = chainId.split(":")[0] as string;

        return namespace;
    }

    public static isSupported(chainId: Caip2ChainId) {
        return EBO_SUPPORTED_CHAIN_IDS.includes(chainId);
    }

    /**
     * Fetches the raw chain ID with its keccak256 hash.
     *
     * @param hashedChainId a kecccak256 hashed caip2 chain id
     * @param chainIds a list of chain ids. If not specified, will use `EBO_SUPPORTED_CHAIN_IDS` search space.
     * @returns the CAIP-2 compliant chain ID if hash found, undefined otherwise.
     */
    public static findByHash(
        hashedChainId: Hex,
        chainIds?: Caip2ChainId[],
    ): Caip2ChainId | undefined {
        if (chainIds) {
            return chainIds.find(
                (id) => keccak256(toHex(id)).toLowerCase() === hashedChainId.toLowerCase(),
            );
        } else {
            return this.DEFAULT_SUPPORTED_CHAINS_HASHES[hashedChainId.toLowerCase() as Hex];
        }
    }
}
