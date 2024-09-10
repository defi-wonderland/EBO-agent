import { Caip2ChainId } from "@ebo-agent/blocknumber/dist/types.js";
import { Address, Log } from "viem";

import { Dispute, DisputeStatus, Request, RequestId, Response } from "./prophet.js";

export type EboEventName =
    | "RequestCreated"
    | "ResponseProposed"
    | "ResponseDisputed"
    | "DisputeStatusChanged"
    | "DisputeEscalated"
    | "RequestFinalized";

export interface ResponseProposed {
    requestId: string;
    responseId: string;
    response: Response["prophetData"];
}

export interface RequestCreated {
    epoch: bigint;
    chainId: Caip2ChainId;
    request: Request["prophetData"];
    requestId: RequestId;
}

export interface ResponseDisputed {
    responseId: string;
    disputeId: string;
    dispute: Dispute["prophetData"];
}

export interface DisputeStatusChanged {
    disputeId: string;
    dispute: Dispute["prophetData"];
    status: DisputeStatus;
    blockNumber: bigint;
}

export interface DisputeEscalated {
    caller: Address;
    disputeId: string;
    blockNumber: bigint;
}

export interface RequestFinalized {
    requestId: RequestId;
    responseId: string;
    caller: string;
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
