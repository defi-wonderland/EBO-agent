import { afterEach } from "node:test";
import { UnsupportedChain } from "@ebo-agent/blocknumber";
import { UnixTimestamp } from "@ebo-agent/shared";
import { Hex } from "viem";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { CommandAlreadyRun, CommandNotRun } from "../../../../src/exceptions/index.js";
import { EboRegistry } from "../../../../src/interfaces/index.js";
import { AddRequest, ProphetCodec } from "../../../../src/services/index.js";
import { EboEvent } from "../../../../src/types/index.js";
import { buildRequest } from "../../../mocks/eboActor.mocks.js";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "../../../services/eboActor/fixtures.js";

describe("AddRequest", () => {
    let registry: EboRegistry;

    const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;

    const event: EboEvent<"RequestCreated"> = {
        name: "RequestCreated",
        blockNumber: 1n,
        logIndex: 1,
        timestamp: BigInt(Date.UTC(2024, 0, 1, 0, 0, 0, 0)) as UnixTimestamp,
        requestId: request.id,
        metadata: {
            requestId: request.id,
            request: request.prophetData,
            ipfsHash: "0x01" as Hex,
        },
    };

    beforeEach(() => {
        registry = {
            addRequest: vi.fn(),
            removeRequest: vi.fn(),
        } as unknown as EboRegistry;

        vi.spyOn(ProphetCodec, "decodeRequestDisputeModuleData").mockReturnValue(
            request.decodedData.disputeModuleData,
        );

        vi.spyOn(ProphetCodec, "decodeRequestResponseModuleData").mockReturnValue(
            request.decodedData.responseModuleData,
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("buildFromEvent", () => {
        it("throws if chain is not supported", () => {
            const unsupportedRequest = buildRequest(
                {},
                {
                    requestModuleData: {
                        ...DEFAULT_MOCKED_REQUEST_CREATED_DATA.decodedData.requestModuleData,
                        chainId: "eip155:61",
                    },
                },
            );

            expect(() => {
                AddRequest.buildFromEvent(
                    {
                        blockNumber: 1n,
                        logIndex: 0,
                        name: "RequestCreated",
                        requestId: unsupportedRequest.id,
                        timestamp: BigInt(Date.UTC(2024, 0, 1, 0, 0, 0, 0)) as UnixTimestamp,
                        metadata: {
                            requestId: unsupportedRequest.id,
                            request: unsupportedRequest["prophetData"],
                            ipfsHash: "0x01" as Hex,
                        },
                    },
                    registry,
                );
            }).toThrow(UnsupportedChain);
        });
    });

    describe("run", () => {
        it("adds the request to the registry", () => {
            const command = AddRequest.buildFromEvent(event, registry);

            const mockAddRequest = registry.addRequest as Mock;

            command.run();

            expect(mockAddRequest).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: request.id,
                }),
            );
        });

        it("throws if the command was already run", () => {
            const command = AddRequest.buildFromEvent(event, registry);

            command.run();

            expect(() => command.run()).toThrow(CommandAlreadyRun);
        });
    });

    describe("undo", () => {
        it("removes the added request", () => {
            const command = AddRequest.buildFromEvent(event, registry);

            const mockRemoveRequest = registry.removeRequest as Mock;

            command.run();
            command.undo();

            expect(mockRemoveRequest).toHaveBeenCalledWith(request.id);
        });

        it("throws if undoing the command before being run", () => {
            const command = AddRequest.buildFromEvent(event, registry);

            expect(() => command.undo()).toThrow(CommandNotRun);
        });
    });
});
