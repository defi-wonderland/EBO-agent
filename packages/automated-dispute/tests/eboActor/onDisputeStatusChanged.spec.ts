import { ILogger } from "@ebo-agent/shared";
import { describe, expect, it, vi } from "vitest";

import { EboEvent } from "../../src/types/events";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "./fixtures.ts";
import mocks from "./mocks/index.ts";

const logger: ILogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
};

describe("onDisputeStatusChanged", () => {
    const actorRequest = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
    const response = mocks.buildResponse(actorRequest);

    it("updates the state of the dispute", async () => {
        const dispute = mocks.buildDispute(actorRequest, response, { status: "None" });
        const event: EboEvent<"DisputeStatusChanged"> = {
            name: "DisputeStatusChanged",
            blockNumber: 1n,
            logIndex: 1,
            metadata: {
                disputeId: "0x01",
                status: "Lost",
                dispute: dispute.prophetData,
                blockNumber: 1n,
            },
        };

        const { actor, registry } = mocks.buildEboActor(actorRequest, logger);

        vi.spyOn(registry, "getRequest").mockReturnValue(actorRequest);
        vi.spyOn(registry, "getDispute").mockReturnValue(dispute);

        const mockUpdateDisputeStatus = vi.spyOn(registry, "updateDisputeStatus");

        await actor.onDisputeStatusChanged(event);

        expect(mockUpdateDisputeStatus).toHaveBeenCalledWith(dispute.id, "Lost");
    });

    it("executes the onTerminate callback when dispute has been escalated", async () => {
        const dispute = mocks.buildDispute(actorRequest, response, { status: "Won" });
        const event: EboEvent<"DisputeStatusChanged"> = {
            name: "DisputeStatusChanged",
            blockNumber: 1n,
            logIndex: 1,
            metadata: {
                disputeId: "0x01",
                status: "Escalated",
                dispute: dispute.prophetData,
                blockNumber: 1n,
            },
        };

        const { actor, registry, onTerminate } = mocks.buildEboActor(actorRequest, logger);

        vi.spyOn(registry, "getRequest").mockReturnValue(actorRequest);
        vi.spyOn(registry, "getDispute").mockReturnValue(dispute);

        await actor.onDisputeStatusChanged(event);

        expect(onTerminate).toHaveBeenCalledWith(actorRequest);
    });

    it.skip("notifies when dispute has been escalated");

    it("proposes a new response when dispute status goes into NoResolution", async () => {
        const dispute = mocks.buildDispute(actorRequest, response, { status: "Escalated" });
        const event: EboEvent<"DisputeStatusChanged"> = {
            name: "DisputeStatusChanged",
            blockNumber: 1n,
            logIndex: 1,
            metadata: {
                disputeId: "0x01",
                status: "NoResolution",
                dispute: dispute.prophetData,
                blockNumber: 1n,
            },
        };

        const { actor, registry, protocolProvider, blockNumberService } = mocks.buildEboActor(
            actorRequest,
            logger,
        );

        vi.spyOn(registry, "getRequest").mockReturnValue(actorRequest);
        vi.spyOn(registry, "getDispute").mockReturnValue(dispute);
        vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
            response.prophetData.response.block + 1n,
        );

        const mockProposeResponse = vi.spyOn(protocolProvider, "proposeResponse");

        await actor.onDisputeStatusChanged(event);

        expect(mockProposeResponse).toHaveBeenCalledWith(
            actorRequest.id,
            actorRequest.epoch,
            actorRequest.chainId,
            response.prophetData.response.block + 1n,
        );
    });

    it.skip("notifies if it will duplicate old proposal when handling NoResolution");
});
