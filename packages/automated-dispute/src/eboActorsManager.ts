import { BlockNumberService } from "@ebo-agent/blocknumber";
import { ILogger } from "@ebo-agent/shared";

import { EboActor } from "./eboActor.js";
import { EboMemoryRegistry } from "./eboMemoryRegistry.js";
import { RequestAlreadyHandled } from "./exceptions/index.js";
import { ProtocolProvider } from "./protocolProvider.js";
import { RequestId } from "./types/prophet.js";

export class EboActorsManager {
    private readonly requestActorMap: Map<string, EboActor>;

    constructor() {
        this.requestActorMap = new Map();
    }

    /**
     * Creates and registers the actor by its request ID.
     *
     * @param actor an `EboActor` instance that handles a request.
     */
    public createActor(
        actorRequest: {
            id: RequestId;
            epoch: bigint;
            epochTimestamp: bigint;
        },
        protocolProvider: ProtocolProvider,
        blockNumberService: BlockNumberService,
        logger: ILogger,
    ): EboActor {
        const requestId = actorRequest.id;

        if (this.requestActorMap.has(requestId)) throw new RequestAlreadyHandled(requestId);

        const registry = new EboMemoryRegistry();
        const actor = new EboActor(
            actorRequest,
            protocolProvider,
            blockNumberService,
            registry,
            logger,
        );

        this.requestActorMap.set(requestId, actor);

        return actor;
    }

    /**
     * Get the `EboActor` instance linked with the `requestId`.
     *
     * @param requestId request ID
     * @returns an `EboActor` instance if found by `requestId`, otherwise `undefined`
     */
    public getActor(requestId: string): EboActor | undefined {
        return this.requestActorMap.get(requestId);
    }

    /**
     * Deletes an actor from the manager, based on its linked request.
     *
     * @param requestId request ID
     * @returns `true` if there was a linked actor for the request ID and it was removed, or `false` if the request was not linked to any actor.
     */
    public deleteActor(requestId: string): boolean {
        return this.requestActorMap.delete(requestId);
    }
}
