import { ILogger } from "@ebo-agent/shared";
import { describe, expect, it, vi } from "vitest";

import { EboEvent } from "../../src/types/events.js";
import { Response } from "../../src/types/prophet.js";
import mocks from "../mocks/index.js";
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
            disputeId: "0x03",
            responseId: response.id,
            dispute: {
                requestId: actorRequest.id,
                responseId: response.id,
                disputer: "0x11",
                proposer: "0x12",
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
            currentEpoch: actorRequest.epoch,
            currentEpochBlockNumber: response.prophetData.response.block,
            currentEpochTimestamp: BigInt(Date.UTC(2024, 1, 1, 1, 0, 0, 0)),
        });

        vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
            response.prophetData.response.block + 1n,
        );

        const mockPledgeForDispute = vi.spyOn(protocolProvider, "pledgeForDispute");

        actor.enqueue(event);

        await actor.processEvents();

        expect(mockPledgeForDispute).toHaveBeenCalled();
    });

    it("pledges against dispute if proposal is ok", async () => {
        const { actor, registry, blockNumberService, protocolProvider } = mocks.buildEboActor(
            actorRequest,
            logger,
        );

        vi.spyOn(registry, "getRequest").mockReturnValue(actorRequest);
        vi.spyOn(registry, "getResponse").mockReturnValue(response);

        vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue({
            currentEpoch: actorRequest.epoch,
            currentEpochBlockNumber: response.prophetData.response.block,
            currentEpochTimestamp: BigInt(Date.UTC(2024, 1, 1, 1, 0, 0, 0)),
        });

        vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
            response.prophetData.response.block,
        );

        const mockPledgeAgainstDispute = vi.spyOn(protocolProvider, "pledgeAgainstDispute");

        actor.enqueue(event);

        await actor.processEvents();

        expect(mockPledgeAgainstDispute).toHaveBeenCalled();
    });

    it("adds dispute to registry", async () => {
        const { actor, registry, blockNumberService, protocolProvider } = mocks.buildEboActor(
            actorRequest,
            logger,
        );

        vi.spyOn(registry, "getRequest").mockReturnValue(actorRequest);
        vi.spyOn(registry, "getResponse").mockReturnValue(response);

        vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue({
            currentEpoch: actorRequest.epoch,
            currentEpochBlockNumber: response.prophetData.response.block,
            currentEpochTimestamp: BigInt(Date.UTC(2024, 1, 1, 1, 0, 0, 0)),
        });

        vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
            response.prophetData.response.block,
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
