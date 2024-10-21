import { Caip2ChainId, UnixTimestamp } from "@ebo-agent/shared";
import { Address, Hex } from "viem";

import { ProtocolContractsAddresses } from "../../../src/interfaces/index.js";
import { ProphetCodec } from "../../../src/services/prophetCodec.js";
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
    createdAt: {
        timestamp: 1625097600n as UnixTimestamp,
        blockNumber: 1n,
        logIndex: 0,
    },
    decodedData: {
        response: {
            block: 123456n,
        },
    },
    prophetData: {
        proposer: "0x9876543210987654321098765432109876543210" as Address,
        requestId: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef" as RequestId,
        response: "0x00000000" as Hex,
    },
};

const DEFAULT_REQUEST_MODULES_DATA = {
    request: {
        chainId: "eip155:1" as Caip2ChainId,
        epoch: 1n,
        accountingExtension: "0x1234567890123456789012345678901234567890" as Address,
        paymentAmount: 1n,
    },
    response: {
        accountingExtension: "0x1234567890123456789012345678901234567890" as Address,
        bondToken: "0x1234567890123456789012345678901234567890" as Address,
        bondSize: 1n,
        deadline: 10n,
        disputeWindow: 1n,
    },
    dispute: {
        accountingExtension: "0x1234567890123456789012345678901234567890" as Address,
        bondToken: "0x1234567890123456789012345678901234567890" as Address,
        bondEscalationDeadline: 5n,
        bondSize: 1n,
        disputeWindow: 1n,
        maxNumberOfEscalations: 5n,
        tyingBuffer: 1n,
    },
};

export const DEFAULT_MOCKED_REQUEST_CREATED_DATA: Request = {
    id: "0x01" as RequestId,
    createdAt: {
        timestamp: BigInt(Date.UTC(2024, 0, 1, 0, 0, 0, 0) / 1000) as UnixTimestamp,
        blockNumber: 1n,
        logIndex: 0,
    },
    status: "Active",
    decodedData: {
        requestModuleData: DEFAULT_REQUEST_MODULES_DATA["request"],
        responseModuleData: DEFAULT_REQUEST_MODULES_DATA["response"],
        disputeModuleData: DEFAULT_REQUEST_MODULES_DATA["dispute"],
    },
    prophetData: {
        nonce: 1n,
        disputeModule: "0x0111111111111111111111111111111111111111" as Address,
        finalityModule: "0x0211111111111111111111111111111111111111" as Address,
        requestModule: "0x0311111111111111111111111111111111111111" as Address,
        resolutionModule: "0x0411111111111111111111111111111111111111" as Address,
        responseModule: "0x0511111111111111111111111111111111111111" as Address,
        requester: "0x1011111111111111111111111111111111111111" as Address,
        requestModuleData: ProphetCodec.encodeRequestRequestModuleData(
            DEFAULT_REQUEST_MODULES_DATA["request"],
        ),
        responseModuleData: ProphetCodec.encodeRequestResponseModuleData(
            DEFAULT_REQUEST_MODULES_DATA["response"],
        ),
        disputeModuleData: ProphetCodec.encodeRequestDisputeModuleData(
            DEFAULT_REQUEST_MODULES_DATA["dispute"],
        ),
        finalityModuleData: "0x1311111111111111111111111111111111111111" as Hex,
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
