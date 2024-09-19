import { Address } from "viem";

import { Dispute, Request, RequestId, Response } from "../../../src/types/prophet";

export const mockedPrivateKey =
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

export const DEFAULT_MOCKED_PROTOCOL_CONTRACTS = {
    oracle: "0x1234560000000000000000000000000000000000" as Address,
    epochManager: "0x6543210000000000000000000000000000000000" as Address,
    eboRequestCreator: "0x9999990000000000000000000000000000000000" as Address,
};

export const DEFAULT_MOCKED_RESPONSE_DATA: Response = {
    id: "0x1234567890123456789012345678901234567890",
    createdAt: 1625097600n,
    prophetData: {
        proposer: "0x9876543210987654321098765432109876543210" as Address,
        requestId: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef" as Address,
        response: {
            chainId: "eip155:1",
            block: 123456n,
            epoch: 1n,
        },
    },
};

export const DEFAULT_MOCKED_REQUEST_CREATED_DATA: Request = {
    id: "0x01" as RequestId,
    chainId: "eip155:1",
    epoch: 1n,
    createdAt: 1n,
    status: "Active",
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

export const DEFAULT_MOCKED_DISPUTE_DATA: Dispute = {
    id: "0x3456789012345678901234567890123456789012",
    createdAt: 1625097800n,
    status: "Active",
    prophetData: {
        disputer: "0x5678901234567890123456789012345678901234",
        proposer: DEFAULT_MOCKED_RESPONSE_DATA.prophetData.proposer,
        requestId: DEFAULT_MOCKED_REQUEST_CREATED_DATA.id,
        responseId: DEFAULT_MOCKED_RESPONSE_DATA.id,
    },
};
