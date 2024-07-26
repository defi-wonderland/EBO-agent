import { Address } from "viem";

import { ProtocolContractsNames } from "../constants.js";

export type ProtocolContract = (typeof ProtocolContractsNames)[number];
export type ProtocolContractsAddresses = Record<ProtocolContract, Address>;
