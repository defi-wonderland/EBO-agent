import { Log } from "viem";

import { Dispute, Request, Response } from "./prophet.js";

export type BaseEvent = {
    name: string;
    blockNumber: bigint;
    logIndex: number;
    rawLog?: Log;
    metadata: unknown;
};

export type NewEpoch = BaseEvent & { metadata: { epoch: bigint; epochBlockNumber: bigint } };

export type RequestCreated = BaseEvent & { metadata: { requestId: string; request: Request } };

export type ResponseProposed = BaseEvent & {
    metadata: { requestId: string; responseId: string; response: Response };
};

export type ResponseDisputed = BaseEvent & {
    metadata: { requestId: string; responseId: string; dispute: Dispute };
};

export type DisputeStatusChanged = BaseEvent & {
    metadata: { disputeId: string; status: string; blockNumber: bigint };
};

export type EboEvent =
    | NewEpoch
    | RequestCreated
    | ResponseProposed
    | ResponseDisputed
    | DisputeStatusChanged;
