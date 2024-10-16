import { Caip2ChainId } from "@ebo-agent/shared";

import { RequestId } from "./prophet.js";

export type ActorRequest = { id: RequestId; epoch: bigint; chainId: Caip2ChainId };
