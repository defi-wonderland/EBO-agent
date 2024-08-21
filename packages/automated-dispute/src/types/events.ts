import { Caip2ChainId } from "@ebo-agent/blocknumber/dist/types.js";
import { Log } from "viem";

import { Dispute, DisputeStatus, Request, Response } from "./prophet.js";

export type EboEventName =
    | "NewEpoch"
    | "RequestCreated"
    | "ResponseProposed"
    | "ResponseDisputed"
    | "DisputeStatusChanged"
    | "DisputeEscalated"
    | "RequestFinalized";

export interface NewEpoch {
    epoch: bigint;
    epochBlockNumber: bigint;
}

export interface ResponseProposed {
    requestId: string;
    responseId: string;
    response: Response["prophetData"];
}

export interface RequestCreated {
    epoch: bigint;
    chainId: Caip2ChainId;
    request: Request["prophetData"];
    requestId: string;
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

export interface RequestFinalized {
    requestId: string;
    responseId: string;
    caller: string;
    blockNumber: bigint;
}

export type EboEventData<E extends EboEventName> = E extends "NewEpoch"
    ? NewEpoch
    : E extends "RequestCreated"
      ? RequestCreated
      : E extends "ResponseProposed"
        ? ResponseProposed
        : E extends "ResponseDisputed"
          ? ResponseDisputed
          : E extends "DisputeStatusChanged"
            ? DisputeStatusChanged
            : E extends "RequestFinalized"
              ? RequestFinalized
              : never;

export type EboEvent<T extends EboEventName> = {
    name: T;
    blockNumber: bigint;
    logIndex: number;
    rawLog?: Log;
    requestId: string; // Field to use to route events to actors
    metadata: EboEventData<T>;
};
