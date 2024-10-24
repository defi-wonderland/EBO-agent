import { UnixTimestamp } from "@ebo-agent/shared";
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
    | "DisputeStatusUpdated"
    | "DisputeEscalated"
    | "OracleRequestFinalized";

export interface RequestCreated {
    requestId: RequestId;
    request: Request["prophetData"];
    ipfsHash: Hex;
}

export interface ResponseProposed {
    requestId: RequestId;
    responseId: ResponseId;
    response: Response["prophetData"];
}

export interface ResponseDisputed {
    responseId: ResponseId;
    disputeId: DisputeId;
    dispute: Dispute["prophetData"];
}

export interface DisputeStatusUpdated {
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

export interface OracleRequestFinalized {
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
        : E extends "DisputeStatusUpdated"
          ? DisputeStatusUpdated
          : E extends "DisputeEscalated"
            ? DisputeEscalated
            : E extends "OracleRequestFinalized"
              ? OracleRequestFinalized
              : never;

export type EboEvent<T extends EboEventName> = {
    name: T;
    /** Block's number this event was logged on */
    blockNumber: bigint;
    /** Log index relative to the block this event was logged on */
    logIndex: number;
    /** Block's timestamp this event was logged on */
    timestamp: UnixTimestamp;
    rawLog?: Log;
    requestId: RequestId; // Field to use to route events to actors
    metadata: EboEventData<T>;
};
