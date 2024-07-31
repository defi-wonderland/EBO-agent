import { BlockNumberService } from "@ebo-agent/blocknumber";

import { ProtocolProvider } from "./protocolProvider.js";
import {
    DisputeStatusChanged,
    RequestCreated,
    RequestFinalizable,
    ResponseDisputed,
} from "./types/events.js";
import { Dispute, Response } from "./types/prophet.js";

export class EboActor {
    private requestActivity: unknown[];

    constructor(
        private readonly protocolProvider: ProtocolProvider,
        private readonly blockNumberService: BlockNumberService,
        private readonly requestId: string,
    ) {
        this.requestActivity = [];
    }

    public async onRequestCreated(_event: RequestCreated): Promise<void> {
        // TODO: implement
        return;
    }

    public async onResponseProposed(_event: ResponseDisputed): Promise<void> {
        // TODO: implement
        return;
    }

    public async onResponseDisputed(_event: ResponseDisputed): Promise<void> {
        // TODO: implement
        return;
    }

    private async proposeResponse(_response: Response): Promise<void> {
        // TODO: implement
        return;
    }

    private async disputeProposal(_dispute: Dispute): Promise<void> {
        // TODO: implement
        return;
    }

    private async isValidDispute(_dispute: Dispute): Promise<boolean> {
        // TODO: implement
        return true;
    }

    public async onFinalizeRequest(_event: RequestFinalizable): Promise<void> {
        // TODO: implement
        return;
    }

    public async onDisputeStatusChanged(_event: DisputeStatusChanged): Promise<void> {
        // TODO: implement
        return;
    }

    public async onDisputeEscalated(_event: Dispute): Promise<void> {
        return;
    }
}
