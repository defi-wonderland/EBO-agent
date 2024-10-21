import { InvalidHex } from "../exceptions/index.js";
import { NormalizedHex } from "../types/index.js";

const HEX_REGEX = /^0x[A-Fa-f0-9]+$/;

/** Utils to handle hex values */
export class HexUtils {
    /**
     * Normalizes a hex string to all lowercase letters.
     *
     * @param hex a valid hex string
     * @returns a normalized hex string
     */
    public static normalize(hex: string): NormalizedHex {
        if (!HEX_REGEX.test(hex)) throw new InvalidHex(hex);

        return hex.toLowerCase() as NormalizedHex;
    }

    /**
     * Check if a hex string is already normalized.
     *
     * @param hex a hex string
     * @returns true if `hex` is normalized, false otherwise.
     */
    public static isNormalized(hex: string): boolean {
        try {
            return hex == HexUtils.normalize(hex);
        } catch (err) {
            if (err instanceof InvalidHex) return false;

            throw err;
        }
    }
}
