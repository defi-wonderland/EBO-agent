import { ILogger } from "@ebo-agent/shared";

import { EboActor } from "../eboActor.js";
import { EboActorsManager } from "../eboActorsManager.js";
import { ProtocolProvider } from "../protocolProvider.js";

const DEFAULT_MS_BETWEEN_CHECKS = 10 * 60 * 1000; // 10 minutes

export class EboProcessor {
    private eventsInterval?: NodeJS.Timeout;
    private lastCheckedBlock?: bigint;

    constructor(
        private readonly protocolProvider: ProtocolProvider,
        private readonly actorsManager: EboActorsManager,
        private readonly logger: ILogger,
    ) {}

    public async start(msBetweenChecks: number = DEFAULT_MS_BETWEEN_CHECKS) {
        this.bootstrap(); // Bootstrapping

        this.eventsInterval = setInterval(this.eventLoop, msBetweenChecks);
    }

    private async bootstrap() {
        // TODO
    }

    private async eventLoop() {
        // TODO
    }

    private async onActorError(_actor: EboActor, _error: Error) {
        // TODO
    }

    private async notifyError(_error: Error) {
        // TODO
    }
}
