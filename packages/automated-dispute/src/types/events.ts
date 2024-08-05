import { Log } from "viem";

import { Dispute, Request } from "./prophet.js";

export type EboEventName =
    | "NewEpoch"
    | "RequestCreated"
    | "ResponseProposed"
    | "ResponseDisputed"
    | "DisputeStatusChanged"
    | "DisputeEscalated"
    | "RequestFinalizable"
    | "RequestFinalized";

export interface NewEpoch {
    epoch: bigint;
    epochBlockNumber: bigint;
}

export interface ResponseCreated {
    requestId: string;
    request: Request;
}

export interface RequestCreated {
    requestId: string;
    request: Request;
}

export interface ResponseDisputed {
    requestId: string;
    responseId: string;
    dispute: Dispute;
}

export interface DisputeStatusChanged {
    disputeId: string;
    status: string;
    blockNumber: bigint;
}

export interface DisputeEscalated {
    caller: string;
    disputeId: string;
    blockNumber: bigint;
}

export interface RequestFinalizable {
    requestId: string;
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
      : E extends "ResponseCreated"
        ? ResponseCreated
        : E extends "ResponseDisputed"
          ? ResponseDisputed
          : E extends "DisputeStatusChanged"
            ? DisputeStatusChanged
            : E extends "DisputeEscalated"
              ? DisputeEscalated
              : E extends "RequestFinalizable"
                ? RequestFinalizable
                : E extends "RequestFinalized"
                  ? RequestFinalized
                  : never;

export type EboEvent<T extends EboEventName> = {
    name: T;
    blockNumber: bigint;
    logIndex: number;
    rawLog?: Log;
    metadata: EboEventData<T>;
};
