import { Caip2ChainId } from "@ebo-agent/blocknumber/src/index.js";

import { RequestId } from "./prophet.js";

export type ActorRequest = { id: RequestId; epoch: bigint; chainId: Caip2ChainId };
