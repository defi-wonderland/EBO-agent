import { EboActor } from "./eboActor.js";
import { RequestAlreadyHandled } from "./exceptions/index.js";

export class EboActorsManager {
    private readonly requestActorMap: Map<string, EboActor>;

    constructor() {
        this.requestActorMap = new Map();
    }

    /**
     * Registers the link between a request ID and the actor handling the respective request.
     *
     * @param requestId request ID
     * @param actor an `EboActor` instance that handles the request
     */
    public registerActor(requestId: string, actor: EboActor): void {
        if (this.requestActorMap.has(requestId)) throw new RequestAlreadyHandled(requestId);

        this.requestActorMap.set(requestId, actor);
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
