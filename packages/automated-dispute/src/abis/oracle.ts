export const oracleAbi = [
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_requestId",
                type: "bytes32",
            },
        ],
        type: "error",
        name: "Oracle_AlreadyFinalized",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_disputeId",
                type: "bytes32",
            },
        ],
        type: "error",
        name: "Oracle_CannotEscalate",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_disputeId",
                type: "bytes32",
            },
        ],
        type: "error",
        name: "Oracle_CannotResolve",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_responseId",
                type: "bytes32",
            },
        ],
        type: "error",
        name: "Oracle_FinalizableResponseExists",
    },
    { inputs: [], type: "error", name: "Oracle_InvalidDisputeBody" },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_disputeId",
                type: "bytes32",
            },
        ],
        type: "error",
        name: "Oracle_InvalidDisputeId",
    },
    {
        inputs: [],
        type: "error",
        name: "Oracle_InvalidFinalizedResponse",
    },
    { inputs: [], type: "error", name: "Oracle_InvalidRequestBody" },
    { inputs: [], type: "error", name: "Oracle_InvalidResponseBody" },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_disputeId",
                type: "bytes32",
            },
        ],
        type: "error",
        name: "Oracle_NoResolutionModule",
    },
    {
        inputs: [{ internalType: "address", name: "_caller", type: "address" }],
        type: "error",
        name: "Oracle_NotDisputeOrResolutionModule",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_responseId",
                type: "bytes32",
            },
        ],
        type: "error",
        name: "Oracle_ResponseAlreadyDisputed",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "_caller",
                type: "address",
                indexed: true,
            },
            {
                internalType: "bytes32",
                name: "_disputeId",
                type: "bytes32",
                indexed: true,
            },
            {
                internalType: "uint256",
                name: "_blockNumber",
                type: "uint256",
                indexed: false,
            },
        ],
        type: "event",
        name: "DisputeEscalated",
        anonymous: false,
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "_caller",
                type: "address",
                indexed: true,
            },
            {
                internalType: "bytes32",
                name: "_disputeId",
                type: "bytes32",
                indexed: true,
            },
            {
                internalType: "uint256",
                name: "_blockNumber",
                type: "uint256",
                indexed: false,
            },
        ],
        type: "event",
        name: "DisputeResolved",
        anonymous: false,
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_disputeId",
                type: "bytes32",
                indexed: true,
            },
            {
                internalType: "enum IOracle.DisputeStatus",
                name: "_status",
                type: "uint8",
                indexed: false,
            },
            {
                internalType: "uint256",
                name: "_blockNumber",
                type: "uint256",
                indexed: false,
            },
        ],
        type: "event",
        name: "DisputeStatusUpdated",
        anonymous: false,
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_requestId",
                type: "bytes32",
                indexed: true,
            },
            {
                internalType: "bytes32",
                name: "_responseId",
                type: "bytes32",
                indexed: true,
            },
            {
                internalType: "address",
                name: "_caller",
                type: "address",
                indexed: true,
            },
            {
                internalType: "uint256",
                name: "_blockNumber",
                type: "uint256",
                indexed: false,
            },
        ],
        type: "event",
        name: "OracleRequestFinalized",
        anonymous: false,
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_requestId",
                type: "bytes32",
                indexed: true,
            },
            {
                internalType: "struct IOracle.Request",
                name: "_request",
                type: "tuple",
                components: [
                    { internalType: "uint96", name: "nonce", type: "uint96" },
                    {
                        internalType: "address",
                        name: "requester",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "requestModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "responseModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "disputeModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "resolutionModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "finalityModule",
                        type: "address",
                    },
                    {
                        internalType: "bytes",
                        name: "requestModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "responseModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "disputeModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "resolutionModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "finalityModuleData",
                        type: "bytes",
                    },
                ],
                indexed: false,
            },
            {
                internalType: "bytes32",
                name: "_ipfsHash",
                type: "bytes32",
                indexed: false,
            },
            {
                internalType: "uint256",
                name: "_blockNumber",
                type: "uint256",
                indexed: false,
            },
        ],
        type: "event",
        name: "RequestCreated",
        anonymous: false,
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_responseId",
                type: "bytes32",
                indexed: true,
            },
            {
                internalType: "bytes32",
                name: "_disputeId",
                type: "bytes32",
                indexed: true,
            },
            {
                internalType: "struct IOracle.Dispute",
                name: "_dispute",
                type: "tuple",
                components: [
                    {
                        internalType: "address",
                        name: "disputer",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "proposer",
                        type: "address",
                    },
                    {
                        internalType: "bytes32",
                        name: "responseId",
                        type: "bytes32",
                    },
                    {
                        internalType: "bytes32",
                        name: "requestId",
                        type: "bytes32",
                    },
                ],
                indexed: false,
            },
            {
                internalType: "uint256",
                name: "_blockNumber",
                type: "uint256",
                indexed: false,
            },
        ],
        type: "event",
        name: "ResponseDisputed",
        anonymous: false,
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_requestId",
                type: "bytes32",
                indexed: true,
            },
            {
                internalType: "bytes32",
                name: "_responseId",
                type: "bytes32",
                indexed: true,
            },
            {
                internalType: "struct IOracle.Response",
                name: "_response",
                type: "tuple",
                components: [
                    {
                        internalType: "address",
                        name: "proposer",
                        type: "address",
                    },
                    {
                        internalType: "bytes32",
                        name: "requestId",
                        type: "bytes32",
                    },
                    { internalType: "bytes", name: "response", type: "bytes" },
                ],
                indexed: false,
            },
            {
                internalType: "uint256",
                name: "_blockNumber",
                type: "uint256",
                indexed: false,
            },
        ],
        type: "event",
        name: "ResponseProposed",
        anonymous: false,
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_requestId",
                type: "bytes32",
            },
            { internalType: "address", name: "_module", type: "address" },
        ],
        stateMutability: "view",
        type: "function",
        name: "allowedModule",
        outputs: [{ internalType: "bool", name: "_allowedModule", type: "bool" }],
    },
    {
        inputs: [
            {
                internalType: "struct IOracle.Request",
                name: "_request",
                type: "tuple",
                components: [
                    { internalType: "uint96", name: "nonce", type: "uint96" },
                    {
                        internalType: "address",
                        name: "requester",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "requestModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "responseModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "disputeModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "resolutionModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "finalityModule",
                        type: "address",
                    },
                    {
                        internalType: "bytes",
                        name: "requestModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "responseModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "disputeModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "resolutionModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "finalityModuleData",
                        type: "bytes",
                    },
                ],
            },
            {
                internalType: "bytes32",
                name: "_ipfsHash",
                type: "bytes32",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
        name: "createRequest",
        outputs: [
            {
                internalType: "bytes32",
                name: "_requestId",
                type: "bytes32",
            },
        ],
    },
    {
        inputs: [
            {
                internalType: "struct IOracle.Request[]",
                name: "_requestsData",
                type: "tuple[]",
                components: [
                    { internalType: "uint96", name: "nonce", type: "uint96" },
                    {
                        internalType: "address",
                        name: "requester",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "requestModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "responseModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "disputeModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "resolutionModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "finalityModule",
                        type: "address",
                    },
                    {
                        internalType: "bytes",
                        name: "requestModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "responseModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "disputeModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "resolutionModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "finalityModuleData",
                        type: "bytes",
                    },
                ],
            },
            {
                internalType: "bytes32[]",
                name: "_ipfsHashes",
                type: "bytes32[]",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
        name: "createRequests",
        outputs: [
            {
                internalType: "bytes32[]",
                name: "_batchRequestsIds",
                type: "bytes32[]",
            },
        ],
    },
    {
        inputs: [{ internalType: "bytes32", name: "_id", type: "bytes32" }],
        stateMutability: "view",
        type: "function",
        name: "disputeCreatedAt",
        outputs: [
            {
                internalType: "uint128",
                name: "_disputeCreatedAt",
                type: "uint128",
            },
        ],
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_responseId",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
        name: "disputeOf",
        outputs: [
            {
                internalType: "bytes32",
                name: "_disputeId",
                type: "bytes32",
            },
        ],
    },
    {
        inputs: [
            {
                internalType: "struct IOracle.Request",
                name: "_request",
                type: "tuple",
                components: [
                    { internalType: "uint96", name: "nonce", type: "uint96" },
                    {
                        internalType: "address",
                        name: "requester",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "requestModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "responseModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "disputeModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "resolutionModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "finalityModule",
                        type: "address",
                    },
                    {
                        internalType: "bytes",
                        name: "requestModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "responseModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "disputeModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "resolutionModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "finalityModuleData",
                        type: "bytes",
                    },
                ],
            },
            {
                internalType: "struct IOracle.Response",
                name: "_response",
                type: "tuple",
                components: [
                    {
                        internalType: "address",
                        name: "proposer",
                        type: "address",
                    },
                    {
                        internalType: "bytes32",
                        name: "requestId",
                        type: "bytes32",
                    },
                    { internalType: "bytes", name: "response", type: "bytes" },
                ],
            },
            {
                internalType: "struct IOracle.Dispute",
                name: "_dispute",
                type: "tuple",
                components: [
                    {
                        internalType: "address",
                        name: "disputer",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "proposer",
                        type: "address",
                    },
                    {
                        internalType: "bytes32",
                        name: "responseId",
                        type: "bytes32",
                    },
                    {
                        internalType: "bytes32",
                        name: "requestId",
                        type: "bytes32",
                    },
                ],
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
        name: "disputeResponse",
        outputs: [
            {
                internalType: "bytes32",
                name: "_disputeId",
                type: "bytes32",
            },
        ],
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_disputeId",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
        name: "disputeStatus",
        outputs: [
            {
                internalType: "enum IOracle.DisputeStatus",
                name: "_status",
                type: "uint8",
            },
        ],
    },
    {
        inputs: [
            {
                internalType: "struct IOracle.Request",
                name: "_request",
                type: "tuple",
                components: [
                    { internalType: "uint96", name: "nonce", type: "uint96" },
                    {
                        internalType: "address",
                        name: "requester",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "requestModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "responseModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "disputeModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "resolutionModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "finalityModule",
                        type: "address",
                    },
                    {
                        internalType: "bytes",
                        name: "requestModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "responseModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "disputeModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "resolutionModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "finalityModuleData",
                        type: "bytes",
                    },
                ],
            },
            {
                internalType: "struct IOracle.Response",
                name: "_response",
                type: "tuple",
                components: [
                    {
                        internalType: "address",
                        name: "proposer",
                        type: "address",
                    },
                    {
                        internalType: "bytes32",
                        name: "requestId",
                        type: "bytes32",
                    },
                    { internalType: "bytes", name: "response", type: "bytes" },
                ],
            },
            {
                internalType: "struct IOracle.Dispute",
                name: "_dispute",
                type: "tuple",
                components: [
                    {
                        internalType: "address",
                        name: "disputer",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "proposer",
                        type: "address",
                    },
                    {
                        internalType: "bytes32",
                        name: "responseId",
                        type: "bytes32",
                    },
                    {
                        internalType: "bytes32",
                        name: "requestId",
                        type: "bytes32",
                    },
                ],
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
        name: "escalateDispute",
    },
    {
        inputs: [
            {
                internalType: "struct IOracle.Request",
                name: "_request",
                type: "tuple",
                components: [
                    { internalType: "uint96", name: "nonce", type: "uint96" },
                    {
                        internalType: "address",
                        name: "requester",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "requestModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "responseModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "disputeModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "resolutionModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "finalityModule",
                        type: "address",
                    },
                    {
                        internalType: "bytes",
                        name: "requestModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "responseModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "disputeModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "resolutionModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "finalityModuleData",
                        type: "bytes",
                    },
                ],
            },
            {
                internalType: "struct IOracle.Response",
                name: "_response",
                type: "tuple",
                components: [
                    {
                        internalType: "address",
                        name: "proposer",
                        type: "address",
                    },
                    {
                        internalType: "bytes32",
                        name: "requestId",
                        type: "bytes32",
                    },
                    { internalType: "bytes", name: "response", type: "bytes" },
                ],
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
        name: "finalize",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_requestId",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
        name: "finalizedAt",
        outputs: [
            {
                internalType: "uint128",
                name: "_finalizedAt",
                type: "uint128",
            },
        ],
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_requestId",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
        name: "finalizedResponseId",
        outputs: [
            {
                internalType: "bytes32",
                name: "_finalizedResponseId",
                type: "bytes32",
            },
        ],
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_requestId",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
        name: "getResponseIds",
        outputs: [{ internalType: "bytes32[]", name: "_ids", type: "bytes32[]" }],
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_requestId",
                type: "bytes32",
            },
            { internalType: "address", name: "_user", type: "address" },
        ],
        stateMutability: "view",
        type: "function",
        name: "isParticipant",
        outputs: [{ internalType: "bool", name: "_isParticipant", type: "bool" }],
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "_startFrom",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "_batchSize",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
        name: "listRequestIds",
        outputs: [
            {
                internalType: "bytes32[]",
                name: "_list",
                type: "bytes32[]",
            },
        ],
    },
    {
        inputs: [{ internalType: "uint256", name: "_nonce", type: "uint256" }],
        stateMutability: "view",
        type: "function",
        name: "nonceToRequestId",
        outputs: [
            {
                internalType: "bytes32",
                name: "_requestId",
                type: "bytes32",
            },
        ],
    },
    {
        inputs: [
            {
                internalType: "struct IOracle.Request",
                name: "_request",
                type: "tuple",
                components: [
                    { internalType: "uint96", name: "nonce", type: "uint96" },
                    {
                        internalType: "address",
                        name: "requester",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "requestModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "responseModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "disputeModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "resolutionModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "finalityModule",
                        type: "address",
                    },
                    {
                        internalType: "bytes",
                        name: "requestModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "responseModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "disputeModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "resolutionModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "finalityModuleData",
                        type: "bytes",
                    },
                ],
            },
            {
                internalType: "struct IOracle.Response",
                name: "_response",
                type: "tuple",
                components: [
                    {
                        internalType: "address",
                        name: "proposer",
                        type: "address",
                    },
                    {
                        internalType: "bytes32",
                        name: "requestId",
                        type: "bytes32",
                    },
                    { internalType: "bytes", name: "response", type: "bytes" },
                ],
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
        name: "proposeResponse",
        outputs: [
            {
                internalType: "bytes32",
                name: "_responseId",
                type: "bytes32",
            },
        ],
    },
    {
        inputs: [{ internalType: "bytes32", name: "_id", type: "bytes32" }],
        stateMutability: "view",
        type: "function",
        name: "requestCreatedAt",
        outputs: [
            {
                internalType: "uint128",
                name: "_requestCreatedAt",
                type: "uint128",
            },
        ],
    },
    {
        inputs: [
            {
                internalType: "struct IOracle.Request",
                name: "_request",
                type: "tuple",
                components: [
                    { internalType: "uint96", name: "nonce", type: "uint96" },
                    {
                        internalType: "address",
                        name: "requester",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "requestModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "responseModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "disputeModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "resolutionModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "finalityModule",
                        type: "address",
                    },
                    {
                        internalType: "bytes",
                        name: "requestModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "responseModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "disputeModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "resolutionModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "finalityModuleData",
                        type: "bytes",
                    },
                ],
            },
            {
                internalType: "struct IOracle.Response",
                name: "_response",
                type: "tuple",
                components: [
                    {
                        internalType: "address",
                        name: "proposer",
                        type: "address",
                    },
                    {
                        internalType: "bytes32",
                        name: "requestId",
                        type: "bytes32",
                    },
                    { internalType: "bytes", name: "response", type: "bytes" },
                ],
            },
            {
                internalType: "struct IOracle.Dispute",
                name: "_dispute",
                type: "tuple",
                components: [
                    {
                        internalType: "address",
                        name: "disputer",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "proposer",
                        type: "address",
                    },
                    {
                        internalType: "bytes32",
                        name: "responseId",
                        type: "bytes32",
                    },
                    {
                        internalType: "bytes32",
                        name: "requestId",
                        type: "bytes32",
                    },
                ],
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
        name: "resolveDispute",
    },
    {
        inputs: [{ internalType: "bytes32", name: "_id", type: "bytes32" }],
        stateMutability: "view",
        type: "function",
        name: "responseCreatedAt",
        outputs: [
            {
                internalType: "uint128",
                name: "_responseCreatedAt",
                type: "uint128",
            },
        ],
    },
    {
        inputs: [],
        stateMutability: "view",
        type: "function",
        name: "totalRequestCount",
        outputs: [{ internalType: "uint256", name: "_count", type: "uint256" }],
    },
    {
        inputs: [
            {
                internalType: "struct IOracle.Request",
                name: "_request",
                type: "tuple",
                components: [
                    { internalType: "uint96", name: "nonce", type: "uint96" },
                    {
                        internalType: "address",
                        name: "requester",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "requestModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "responseModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "disputeModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "resolutionModule",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "finalityModule",
                        type: "address",
                    },
                    {
                        internalType: "bytes",
                        name: "requestModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "responseModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "disputeModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "resolutionModuleData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "finalityModuleData",
                        type: "bytes",
                    },
                ],
            },
            {
                internalType: "struct IOracle.Response",
                name: "_response",
                type: "tuple",
                components: [
                    {
                        internalType: "address",
                        name: "proposer",
                        type: "address",
                    },
                    {
                        internalType: "bytes32",
                        name: "requestId",
                        type: "bytes32",
                    },
                    { internalType: "bytes", name: "response", type: "bytes" },
                ],
            },
            {
                internalType: "struct IOracle.Dispute",
                name: "_dispute",
                type: "tuple",
                components: [
                    {
                        internalType: "address",
                        name: "disputer",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "proposer",
                        type: "address",
                    },
                    {
                        internalType: "bytes32",
                        name: "responseId",
                        type: "bytes32",
                    },
                    {
                        internalType: "bytes32",
                        name: "requestId",
                        type: "bytes32",
                    },
                ],
            },
            {
                internalType: "enum IOracle.DisputeStatus",
                name: "_status",
                type: "uint8",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
        name: "updateDisputeStatus",
    },
] as const;
