import { InvalidAddress } from "../exceptions/index.js";
import { NormalizedAddress } from "../types/index.js";

const ADDRESS_REGEX = /^0x[A-Fa-f0-9]+$/;

export class Address {
    public static normalize(address: string): NormalizedAddress {
        if (!ADDRESS_REGEX.test(address)) throw new InvalidAddress(address);

        return address.toLowerCase() as NormalizedAddress;
    }

    public static isNormalized(address: string): boolean {
        try {
            return address == Address.normalize(address);
        } catch (err) {
            if (err instanceof InvalidAddress) return false;

            throw err;
        }
    }
}
