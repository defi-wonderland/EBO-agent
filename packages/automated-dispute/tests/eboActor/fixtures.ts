import { Address } from "viem";

import { Request, RequestId } from "../../src/types/prophet";

export const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

export const DEFAULT_MOCKED_PROTOCOL_CONTRACTS = {
    oracle: "0x123456" as Address,
    epochManager: "0x654321" as Address,
    eboRequestCreator: "0xabcdef" as Address,
};

export const DEFAULT_MOCKED_REQUEST_CREATED_DATA: Request = {
    id: "0x01" as RequestId,
    chainId: "eip155:1",
    epoch: 1n,
    createdAt: 1n,
    prophetData: {
        disputeModule: "0x01" as Address,
        finalityModule: "0x02" as Address,
        requestModule: "0x03" as Address,
        resolutionModule: "0x04" as Address,
        responseModule: "0x05" as Address,
        requester: "0x10" as Address,
        responseModuleData: {
            accountingExtension: "0x01" as Address,
            bondToken: "0x02" as Address,
            bondSize: 1n,
            deadline: 10n,
            disputeWindow: 1n,
        },
        disputeModuleData: {
            accountingExtension: "0x01" as Address,
            bondToken: "0x01" as Address,
            bondEscalationDeadline: 5n,
            bondSize: 1n,
            disputeWindow: 1n,
            maxNumberOfEscalations: 5n,
            tyingBuffer: 1n,
        },
    },
};
