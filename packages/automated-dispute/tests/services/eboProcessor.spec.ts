import { describe, it } from "vitest";

describe("EboProcessor", () => {
    describe.skip("start", () => {
        it.skip("bootstraps actors with onchain active requests when starting");
        it.skip("fetches events since epoch start when starting");
        it.skip("fetches events since last block checked after first events fetch");
        it.skip("registers new actor when a new request id is detected on events");
        it.skip("forwards events to corresponding actors");
        it.skip("notifies if an actor throws while handling events");
        it.skip("removes the actor when processing onFinalizeRequest event");
    });
});
