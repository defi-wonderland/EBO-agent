import { BlockNumberService } from "@ebo-agent/blocknumber";
import { Address, ILogger } from "@ebo-agent/shared";
import { Mutex } from "async-mutex";

import { RequestAlreadyHandled } from "../exceptions/index.js";
import { ProtocolProvider } from "../providers/protocolProvider.js";
import { RequestId } from "../types/prophet.js";
import { EboActor } from "./eboActor.js";
import { EboMemoryRegistry } from "./eboRegistry/eboMemoryRegistry.js";

export class EboActorsManager {
    private readonly requestActorMap: Map<RequestId, EboActor>;

    constructor() {
        this.requestActorMap = new Map();
    }

    /**
     * Return an array of normalized request IDs this instance is handling.
     *
     * @returns array of normalized request IDs
     */
    public getRequestIds(): RequestId[] {
        return [...this.requestActorMap.entries()].map((entry) => Address.normalize(entry[0]));
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
        },
        protocolProvider: ProtocolProvider,
        blockNumberService: BlockNumberService,
        logger: ILogger,
    ): EboActor {
        const requestId = actorRequest.id;

        if (this.requestActorMap.has(requestId)) throw new RequestAlreadyHandled(requestId);

        const registry = new EboMemoryRegistry();

        const eventProcessingMutex = new Mutex();

        const actor = new EboActor(
            actorRequest,
            protocolProvider,
            blockNumberService,
            registry,
            eventProcessingMutex,
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
    public getActor(requestId: RequestId): EboActor | undefined {
        return this.requestActorMap.get(requestId);
    }

    /**
     * Deletes an actor from the manager, based on its linked request.
     *
     * @param requestId request ID
     * @returns `true` if there was a linked actor for the request ID and it was removed, or `false` if the request was not linked to any actor.
     */
    public deleteActor(requestId: RequestId): boolean {
        return this.requestActorMap.delete(requestId);
    }
}
