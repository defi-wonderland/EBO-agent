import { Caip2ChainId } from "@ebo-agent/blocknumber/src/index.js";
import { Timestamp } from "@ebo-agent/shared";
import { Address, Hex, Log } from "viem";

import {
    Dispute,
    DisputeId,
    DisputeStatus,
    Request,
    RequestId,
    Response,
    ResponseId,
} from "./prophet.js";

export type EboEventName =
    | "RequestCreated"
    | "ResponseProposed"
    | "ResponseDisputed"
    | "DisputeStatusChanged"
    | "DisputeEscalated"
    | "RequestFinalized";

export interface ResponseProposed {
    requestId: Hex;
    responseId: Hex;
    response: Response["prophetData"];
}

export interface RequestCreated {
    epoch: bigint;
    chainId: Caip2ChainId;
    request: Request["prophetData"];
    requestId: RequestId;
}

export interface ResponseDisputed {
    responseId: ResponseId;
    disputeId: DisputeId;
    dispute: Dispute["prophetData"];
}

export interface DisputeStatusChanged {
    disputeId: DisputeId;
    dispute: Dispute["prophetData"];
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
    /** Block's number this event was logged on */
    blockNumber: bigint;
    /** Log index relative to the block this event was logged on */
    logIndex: number;
    /** Block's timestamp this event was logged on */
    timestamp: Timestamp;
    rawLog?: Log;
    requestId: RequestId; // Field to use to route events to actors
    metadata: EboEventData<T>;
};
