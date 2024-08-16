import { EboActor } from "./eboActor.js";
import { RequestAlreadyHandled } from "./exceptions/index.js";

export class EboActorsManager {
    private readonly requestActorMap: Map<string, EboActor>;

    constructor() {
        this.requestActorMap = new Map();
    }

    public registerActor(requestId: string, actor: EboActor): void {
        if (this.requestActorMap.has(requestId)) throw new RequestAlreadyHandled(requestId);

        this.requestActorMap.set(requestId, actor);
    }

    public getActor(requestId: string): EboActor | undefined {
        return this.requestActorMap.get(requestId);
    }

    public deleteActor(requestId: string): boolean {
        return this.requestActorMap.delete(requestId);
    }
}
