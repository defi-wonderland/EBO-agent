// Based on https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md

import { InvalidChainId } from "../../exceptions/invalidChain.js";
import { Caip2ChainId } from "../../types.js";

const NAMESPACE_FORMAT = /^[-a-z0-9]{3,8}$/;
const REFERENCE_FORMAT = /^[-_a-zA-Z0-9]{1,32}$/;

export class Caip2Utils {
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
}
