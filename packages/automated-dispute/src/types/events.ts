import { Caip2ChainId } from "@ebo-agent/blocknumber/src/index.js";
import { Address, Log } from "viem";

import { DisputeId, DisputeStatus, RequestId, ResponseId } from "./prophet.js";

export type EboEventName =
    | "RequestCreated"
    | "ResponseProposed"
    | "ResponseDisputed"
    | "DisputeStatusChanged"
    | "DisputeEscalated"
    | "RequestFinalized";

export interface RequestCreated {
    requestId: RequestId;
    epoch: bigint;
    chainId: Caip2ChainId;
}

export interface ResponseProposed {
    requestId: RequestId;
    responseId: ResponseId;
    response: string;
    blockNumber: bigint;
}

export interface ResponseDisputed {
    responseId: ResponseId;
    disputeId: DisputeId;
    dispute: string;
    blockNumber: bigint;
}

export interface DisputeStatusChanged {
    disputeId: DisputeId;
    dispute: string;
    status: DisputeStatus;
    blockNumber: bigint;
}

export interface DisputeEscalated {
    caller: Address;
    disputeId: DisputeId;
    blockNumber: bigint;
}

export interface RequestFinalized {
    requestId: RequestId;
    responseId: ResponseId;
    caller: Address;
    blockNumber: bigint;
}

export type EboEventData<E extends EboEventName> = E extends "RequestCreated"
    ? RequestCreated
    : E extends "ResponseProposed"
      ? ResponseProposed
      : E extends "ResponseDisputed"
        ? ResponseDisputed
        : E extends "DisputeStatusChanged"
          ? DisputeStatusChanged
          : E extends "DisputeEscalated"
            ? DisputeEscalated
            : E extends "RequestFinalized"
              ? RequestFinalized
              : never;

export type EboEvent<T extends EboEventName> = {
    name: T;
    blockNumber: bigint;
    logIndex: number;
    rawLog?: Log;
    requestId: RequestId; // Field to use to route events to actors
    metadata: EboEventData<T>;
};
