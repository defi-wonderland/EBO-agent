import { ILogger } from "@ebo-agent/shared";
import { ContractFunctionRevertedError } from "viem";
import { describe, expect, it, vi } from "vitest";

import { InvalidActorState } from "../../src/exceptions/invalidActorState.exception";
import { EboEvent } from "../../src/types/events";
import { Response } from "../../src/types/prophet";
import mocks from "../mocks/index.js";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "./fixtures";

const logger: ILogger = mocks.mockLogger();

describe.skip("onResponseDisputed", () => {
    const actorRequest = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
    const response: Response = mocks.buildResponse(actorRequest);

    const event: EboEvent<"ResponseDisputed"> = {
        name: "ResponseDisputed",
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

        vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
            response.prophetData.response.block + 1n,
        );

        const mockPledgeForDispute = vi.spyOn(protocolProvider, "pledgeForDispute");

        await actor.onResponseDisputed(event);

        expect(mockPledgeForDispute).toHaveBeenCalled();
    });

    it("pledges against dispute if proposal is ok", async () => {
        const { actor, registry, blockNumberService, protocolProvider } = mocks.buildEboActor(
            actorRequest,
            logger,
        );

        vi.spyOn(registry, "getRequest").mockReturnValue(actorRequest);
        vi.spyOn(registry, "getResponse").mockReturnValue(response);

        vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
            response.prophetData.response.block,
        );

        const mockPledgeAgainstDispute = vi.spyOn(protocolProvider, "pledgeAgainstDispute");

        await actor.onResponseDisputed(event);

        expect(mockPledgeAgainstDispute).toHaveBeenCalled();
    });

    it("adds dispute to registry", async () => {
        const { actor, registry, blockNumberService, protocolProvider } = mocks.buildEboActor(
            actorRequest,
            logger,
        );

        vi.spyOn(registry, "getRequest").mockReturnValue(actorRequest);
        vi.spyOn(registry, "getResponse").mockReturnValue(response);

        vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
            response.prophetData.response.block,
        );

        vi.spyOn(protocolProvider, "pledgeAgainstDispute").mockResolvedValue();

        const addResponseMock = vi.spyOn(registry, "addDispute");

        await actor.onResponseDisputed(event);

        expect(addResponseMock).toHaveBeenCalled();
    });

    it("resolves if the pledge is reverted", async () => {
        const { actor, blockNumberService, protocolProvider, registry } = mocks.buildEboActor(
            actorRequest,
            logger,
        );

        vi.spyOn(registry, "getRequest").mockReturnValue(actorRequest);
        vi.spyOn(registry, "getResponse").mockReturnValue(response);

        vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
            response.prophetData.response.block + 1n,
        );

        vi.spyOn(protocolProvider, "pledgeForDispute").mockRejectedValue(
            Object.create(ContractFunctionRevertedError.prototype),
        );

        expect(actor.onResponseDisputed(event)).resolves.toBeUndefined();
    });

    it("throws if protocol provider cannot complete pledge", () => {
        const { actor, blockNumberService, protocolProvider, registry } = mocks.buildEboActor(
            actorRequest,
            logger,
        );

        vi.spyOn(registry, "getRequest").mockReturnValue(actorRequest);
        vi.spyOn(registry, "getResponse").mockReturnValue(response);

        vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
            response.prophetData.response.block + 1n,
        );

        vi.spyOn(protocolProvider, "pledgeForDispute").mockRejectedValue(new Error());

        expect(actor.onResponseDisputed(event)).rejects.toThrow();
    });

    it("throws if the response's request is not handled by actor", () => {
        const { actor } = mocks.buildEboActor(actorRequest, logger);

        const otherRequestEvent = {
            ...event,
            metadata: {
                ...event.metadata,
                dispute: {
                    ...event.metadata.dispute,
                    requestId: "0x02",
                },
            },
        };

        expect(actor.onResponseDisputed(otherRequestEvent)).rejects.toThrow(InvalidActorState);
    });
});
