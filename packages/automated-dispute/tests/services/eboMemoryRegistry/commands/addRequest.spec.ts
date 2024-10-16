import { afterEach } from "node:test";
import { UnsupportedChain } from "@ebo-agent/blocknumber";
import { UnixTimestamp } from "@ebo-agent/shared";
import { keccak256, toHex } from "viem";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { CommandAlreadyRun, CommandNotRun } from "../../../../src/exceptions/index.js";
import { EboRegistry } from "../../../../src/interfaces/index.js";
import { ProtocolProvider } from "../../../../src/providers/protocolProvider.js";
import { AddRequest } from "../../../../src/services/index.js";
import { EboEvent, RequestId } from "../../../../src/types/index.js";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "../../../services/eboActor/fixtures.js";

describe("AddRequest", () => {
    let registry: EboRegistry;

    const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
    const event: EboEvent<"RequestCreated"> = {
        name: "RequestCreated",
        blockNumber: 1n,
        logIndex: 1,
        requestId: request.id,
        metadata: {
            chainId: keccak256(toHex(request.chainId)),
            epoch: request.epoch,
            request: request.prophetData,
            requestId: request.id,
        },
    };

    beforeEach(() => {
        registry = {
            addRequest: vi.fn(),
            removeRequest: vi.fn(),
        } as unknown as EboRegistry;

        vi.spyOn(ProtocolProvider, "decodeRequestDisputeModuleData").mockReturnValue(
            request.decodedData.disputeModuleData,
        );

        vi.spyOn(ProtocolProvider, "decodeRequestResponseModuleData").mockReturnValue(
            request.decodedData.responseModuleData,
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("buildFromEvent", () => {
        it("throws if chain is not supported", () => {
            const requestId = "0x01" as RequestId;

            expect(() => {
                AddRequest.buildFromEvent(
                    {
                        blockNumber: 1n,
                        logIndex: 0,
                        name: "RequestCreated",
                        requestId: requestId,
                        timestamp: BigInt(Date.UTC(2024, 0, 1, 0, 0, 0, 0)) as UnixTimestamp,
                        metadata: {
                            chainId: keccak256(toHex("eip000:0123456789")),
                            epoch: 1n,
                            requestId: requestId,
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
