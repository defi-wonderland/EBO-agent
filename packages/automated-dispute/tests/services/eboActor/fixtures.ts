import { UnixTimestamp } from "@ebo-agent/shared";
import { Address, Hex } from "viem";

import { ProtocolContractsAddresses } from "../../../src/interfaces/index.js";
import {
    Dispute,
    DisputeId,
    Request,
    RequestId,
    Response,
    ResponseId,
} from "../../../src/types/prophet";

export const mockedPrivateKey =
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

export const DEFAULT_MOCKED_PROTOCOL_CONTRACTS: ProtocolContractsAddresses = {
    oracle: "0x1234560000000000000000000000000000000000" as Address,
    epochManager: "0x6543210000000000000000000000000000000000" as Address,
    eboRequestCreator: "0x9999990000000000000000000000000000000000" as Address,
    bondEscalationModule: "0x1a2b3c" as Address,
    horizonAccountingExtension: "0x9999990000000000000000000000000000000000" as Address,
};

export const DEFAULT_MOCKED_RESPONSE_DATA: Response = {
    id: "0x1234567890123456789012345678901234567890" as ResponseId,
    createdAt: 1625097600n,
    decodedData: {
        response: {
            chainId: "eip155:1",
            block: 123456n,
            epoch: 1n,
        },
    },
    prophetData: {
        proposer: "0x9876543210987654321098765432109876543210" as Address,
        requestId: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef" as RequestId,
        response: "0x00000000" as Hex,
    },
};

export const DEFAULT_MOCKED_REQUEST_CREATED_DATA: Request = {
    id: "0x01" as RequestId,
    chainId: "eip155:1",
    epoch: 1n,
    createdAt: {
        timestamp: BigInt(Date.UTC(2024, 0, 1, 0, 0, 0, 0) / 1000) as UnixTimestamp,
        blockNumber: 1n,
        logIndex: 0,
    },
    status: "Active",
    decodedData: {
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
    prophetData: {
        nonce: 1n,
        disputeModule: "0x0111111111111111111111111111111111111111" as Address,
        finalityModule: "0x0211111111111111111111111111111111111111" as Address,
        requestModule: "0x0311111111111111111111111111111111111111" as Address,
        resolutionModule: "0x0411111111111111111111111111111111111111" as Address,
        responseModule: "0x0511111111111111111111111111111111111111" as Address,
        requester: "0x1011111111111111111111111111111111111111" as Address,
        responseModuleData: "0x1111111111111111111111111111111111111111" as Hex, // TODO: use the corresponding encoded data
        disputeModuleData: "0x1211111111111111111111111111111111111111" as Hex, // TODO: use the corresponding encoded data
        finalityModuleData: "0x1311111111111111111111111111111111111111" as Hex,
        requestModuleData: "0x1411111111111111111111111111111111111111" as Hex,
        resolutionModuleData: "0x1511111111111111111111111111111111111111" as Hex,
    },
};

export const DEFAULT_MOCKED_DISPUTE_DATA: Dispute = {
    id: "0x3456789012345678901234567890123456789012" as DisputeId,
    createdAt: 1625097800n,
    status: "Active",
    prophetData: {
        disputer: "0x5678901234567890123456789012345678901234",
        proposer: DEFAULT_MOCKED_RESPONSE_DATA.prophetData.proposer,
        requestId: DEFAULT_MOCKED_REQUEST_CREATED_DATA.id,
        responseId: DEFAULT_MOCKED_RESPONSE_DATA.id,
    },
};
