import { ProtocolContractsNames } from "../constants.js";
import { Address } from "./index.js";

export type ProtocolContract = (typeof ProtocolContractsNames)[number];
export type ProtocolContractsAddresses = Record<ProtocolContract, Address>;
