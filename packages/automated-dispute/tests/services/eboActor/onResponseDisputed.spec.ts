import { ILogger } from "@ebo-agent/shared";
import { describe, expect, it, vi } from "vitest";

import { EboEvent } from "../../../src/types/events.js";
import { DisputeId, Response } from "../../../src/types/prophet.js";
import mocks from "../../mocks/index.js";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "./fixtures.js";

const logger: ILogger = mocks.mockLogger();

describe("onResponseDisputed", () => {
    const actorRequest = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
    const response: Response = mocks.buildResponse(actorRequest);

    const event: EboEvent<"ResponseDisputed"> = {
        name: "ResponseDisputed",
        requestId: actorRequest.id,
        blockNumber: 1n,
        logIndex: 1,
        metadata: {
            disputeId: "0x03" as DisputeId,
            responseId: response.id,
            dispute: {
                requestId: actorRequest.id,
                responseId: response.id,
                disputer: "0x1111111111111111111111111111111111111111",
                proposer: "0x2222222222222222222222222222222222222222",
            },
        },
    };

    it("pledges for dispute if proposal should be different", async () => {
        const { actor, registry, blockNumberService, protocolProvider } = mocks.buildEboActor(
            actorRequest,
            logger,
        );

        vi.spyOn(registry, "getRequest").mockReturnValue(actorRequest);
        vi.spyOn(registry, "getResponse").mockReturnValue(response);

        vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue({
            number: actorRequest.epoch,
            firstBlockNumber: response.decodedData.response.block,
            startTimestamp: BigInt(Date.UTC(2024, 1, 1, 1, 0, 0, 0)),
        });

        vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
            response.decodedData.response.block + 1n,
        );

        vi.spyOn(protocolProvider, "pledgeForDispute").mockResolvedValue();

        actor.enqueue(event);

        await actor.processEvents();

        expect(protocolProvider.pledgeForDispute).toHaveBeenCalled();
    });

    it("pledges against dispute if proposal is ok", async () => {
        const { actor, registry, blockNumberService, protocolProvider } = mocks.buildEboActor(
            actorRequest,
            logger,
        );

        vi.spyOn(registry, "getRequest").mockReturnValue(actorRequest);
        vi.spyOn(registry, "getResponse").mockReturnValue(response);

        vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue({
            number: actorRequest.epoch,
            firstBlockNumber: response.decodedData.response.block,
            startTimestamp: BigInt(Date.UTC(2024, 1, 1, 1, 0, 0, 0)),
        });

        vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
            response.decodedData.response.block,
        );

        vi.spyOn(protocolProvider, "pledgeAgainstDispute").mockResolvedValue();

        actor.enqueue(event);

        await actor.processEvents();

        expect(protocolProvider.pledgeAgainstDispute).toHaveBeenCalled();
    });

    it("adds dispute to registry", async () => {
        const { actor, registry, blockNumberService, protocolProvider } = mocks.buildEboActor(
            actorRequest,
            logger,
        );

        vi.spyOn(registry, "getRequest").mockReturnValue(actorRequest);
        vi.spyOn(registry, "getResponse").mockReturnValue(response);

        vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue({
            number: actorRequest.epoch,
            firstBlockNumber: response.decodedData.response.block,
            startTimestamp: BigInt(Date.UTC(2024, 1, 1, 1, 0, 0, 0)),
        });

        vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
            response.decodedData.response.block,
        );

        vi.spyOn(protocolProvider, "pledgeAgainstDispute").mockResolvedValue();

        const addResponseMock = vi.spyOn(registry, "addDispute");

        actor.enqueue(event);

        await actor.processEvents();

        expect(addResponseMock).toHaveBeenCalled();
    });

    // TODO: handle when error handling of reverts is implemented
    it.todo("resolves if the pledge is reverted");
    it.todo("throws if protocol provider cannot complete pledge");
});
