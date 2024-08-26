import { Address } from "viem";

import { Request, RequestId } from "../../src/types/prophet";

export const DEFAULT_MOCKED_PROTOCOL_CONTRACTS = {
    oracle: "0x123456" as Address,
    epochManager: "0x654321" as Address,
};

export const DEFAULT_MOCKED_REQUEST_CREATED_DATA: Request = {
    id: "0x01" as RequestId,
    chainId: "eip155:1",
    epoch: 1n,
    epochTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)),
    createdAt: 1n,
    prophetData: {
        disputeModule: "0x01" as Address,
        finalityModule: "0x02" as Address,
        requestModule: "0x03" as Address,
        resolutionModule: "0x04" as Address,
        responseModule: "0x05" as Address,
        requester: "0x10" as Address,
    },
};
