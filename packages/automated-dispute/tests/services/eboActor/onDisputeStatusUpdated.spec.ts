import { ILogger, UnixTimestamp } from "@ebo-agent/shared";
import { describe, expect, it, vi } from "vitest";

import { ProphetCodec } from "../../../src/services/prophetCodec.ts";
import { DisputeId, EboEvent } from "../../../src/types/index.js";
import mocks from "../../mocks/index.ts";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "./fixtures.ts";

const logger: ILogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
};

describe("onDisputeStatusUpdated", () => {
    const actorRequest = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
    const response = mocks.buildResponse(actorRequest);

    it("updates the state of the dispute", async () => {
        const dispute = mocks.buildDispute(actorRequest, response, { status: "None" });
        const event: EboEvent<"DisputeStatusUpdated"> = {
            name: "DisputeStatusUpdated",
            requestId: actorRequest.id,
            blockNumber: 1n,
            logIndex: 1,
            metadata: {
                disputeId: "0x01" as DisputeId,
                status: "Lost",
                dispute: dispute.prophetData,
                blockNumber: 1n,
            },
        };

        const { actor, registry } = mocks.buildEboActor(actorRequest, logger);

        vi.spyOn(registry, "getRequest").mockReturnValue(actorRequest);
        vi.spyOn(registry, "getDispute").mockReturnValue(dispute);

        const mockUpdateDisputeStatus = vi.spyOn(registry, "updateDisputeStatus");

        actor.enqueue(event);

        await actor.processEvents();

        expect(mockUpdateDisputeStatus).toHaveBeenCalledWith(dispute.id, "Lost");
    });

    it("proposes a new response when dispute status goes into NoResolution", async () => {
        const proposerAddress = "0x1234567890abcdef1234567890abcdef12345678";
        const dispute = mocks.buildDispute(actorRequest, response, { status: "Escalated" });
        const event: EboEvent<"DisputeStatusUpdated"> = {
            name: "DisputeStatusUpdated",
            requestId: actorRequest.id,
            blockNumber: 1n,
            logIndex: 1,
            metadata: {
                disputeId: "0x01" as DisputeId,
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

        vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue({
            number: actorRequest.decodedData.requestModuleData.epoch,
            firstBlockNumber: actorRequest.createdAt.blockNumber,
            startTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0)) as UnixTimestamp,
        });

        vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
            response.decodedData.response.block + 1n,
        );

        vi.spyOn(protocolProvider, "getAccountAddress").mockReturnValue(proposerAddress);

        const mockProposeResponse = vi.spyOn(protocolProvider, "proposeResponse");

        actor.enqueue(event);

        await actor.processEvents();

        expect(mockProposeResponse).toHaveBeenCalledWith(
            actorRequest.prophetData,
            expect.objectContaining({
                proposer: proposerAddress,
                requestId: actorRequest.id,
                response: ProphetCodec.encodeResponse({
                    block: 2n,
                }),
            }),
        );
    });

    it.skip("notifies when dispute has been escalated");
    it.skip("notifies if it will duplicate old proposal when handling NoResolution");
});
