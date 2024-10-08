export const oracleAbi = [
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_requestId",
                type: "bytes32",
            },
        ],
        name: "Oracle_AlreadyFinalized",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_disputeId",
                type: "bytes32",
            },
        ],
        name: "Oracle_CannotEscalate",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_disputeId",
                type: "bytes32",
            },
        ],
        name: "Oracle_CannotResolve",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_responseId",
                type: "bytes32",
            },
        ],
        name: "Oracle_FinalizableResponseExists",
        type: "error",
    },
    {
        inputs: [],
        name: "Oracle_InvalidDispute",
        type: "error",
    },
    {
        inputs: [],
        name: "Oracle_InvalidDisputeBody",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_disputeId",
                type: "bytes32",
            },
        ],
        name: "Oracle_InvalidDisputeId",
        type: "error",
    },
    {
        inputs: [],
        name: "Oracle_InvalidDisputer",
        type: "error",
    },
    {
        inputs: [],
        name: "Oracle_InvalidFinalizedResponse",
        type: "error",
    },
    {
        inputs: [],
        name: "Oracle_InvalidProposer",
        type: "error",
    },
    {
        inputs: [],
        name: "Oracle_InvalidRequest",
        type: "error",
    },
    {
        inputs: [],
        name: "Oracle_InvalidRequestBody",
        type: "error",
    },
    {
        inputs: [],
        name: "Oracle_InvalidResponse",
        type: "error",
    },
    {
        inputs: [],
        name: "Oracle_InvalidResponseBody",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_disputeId",
                type: "bytes32",
            },
        ],
        name: "Oracle_NoResolutionModule",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "_caller",
                type: "address",
            },
        ],
        name: "Oracle_NotDisputeOrResolutionModule",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_responseId",
                type: "bytes32",
            },
        ],
        name: "Oracle_ResponseAlreadyDisputed",
        type: "error",
    },
    {
        inputs: [],
        name: "Oracle_ResponseAlreadyProposed",
        type: "error",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "_caller",
                type: "address",
            },
            {
                indexed: true,
                internalType: "bytes32",
                name: "_disputeId",
                type: "bytes32",
            },
            {
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
                internalType: "struct IOracle.Dispute",
                name: "_dispute",
                type: "tuple",
            },
        ],
        name: "DisputeEscalated",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "bytes32",
                name: "_disputeId",
                type: "bytes32",
            },
            {
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
                internalType: "struct IOracle.Dispute",
                name: "_dispute",
                type: "tuple",
            },
            {
                indexed: true,
                internalType: "address",
                name: "_caller",
                type: "address",
            },
        ],
        name: "DisputeResolved",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "bytes32",
                name: "_disputeId",
                type: "bytes32",
            },
            {
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
                internalType: "struct IOracle.Dispute",
                name: "_dispute",
                type: "tuple",
            },
            {
                indexed: false,
                internalType: "enum IOracle.DisputeStatus",
                name: "_status",
                type: "uint8",
            },
        ],
        name: "DisputeStatusUpdated",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "bytes32",
                name: "_requestId",
                type: "bytes32",
            },
            {
                indexed: true,
                internalType: "bytes32",
                name: "_responseId",
                type: "bytes32",
            },
            {
                indexed: true,
                internalType: "address",
                name: "_caller",
                type: "address",
            },
        ],
        name: "OracleRequestFinalized",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "bytes32",
                name: "_requestId",
                type: "bytes32",
            },
            {
                components: [
                    {
                        internalType: "uint96",
                        name: "nonce",
                        type: "uint96",
                    },
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
                internalType: "struct IOracle.Request",
                name: "_request",
                type: "tuple",
            },
            {
                indexed: false,
                internalType: "bytes32",
                name: "_ipfsHash",
                type: "bytes32",
            },
        ],
        name: "RequestCreated",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "bytes32",
                name: "_responseId",
                type: "bytes32",
            },
            {
                indexed: true,
                internalType: "bytes32",
                name: "_disputeId",
                type: "bytes32",
            },
            {
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
                internalType: "struct IOracle.Dispute",
                name: "_dispute",
                type: "tuple",
            },
        ],
        name: "ResponseDisputed",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "bytes32",
                name: "_requestId",
                type: "bytes32",
            },
            {
                indexed: true,
                internalType: "bytes32",
                name: "_responseId",
                type: "bytes32",
            },
            {
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
                    {
                        internalType: "bytes",
                        name: "response",
                        type: "bytes",
                    },
                ],
                indexed: false,
                internalType: "struct IOracle.Response",
                name: "_response",
                type: "tuple",
            },
        ],
        name: "ResponseProposed",
        type: "event",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_requestId",
                type: "bytes32",
            },
            {
                internalType: "address",
                name: "_module",
                type: "address",
            },
        ],
        name: "allowedModule",
        outputs: [
            {
                internalType: "bool",
                name: "_isAllowed",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: "uint96",
                        name: "nonce",
                        type: "uint96",
                    },
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
                internalType: "struct IOracle.Request",
                name: "_request",
                type: "tuple",
            },
            {
                internalType: "bytes32",
                name: "_ipfsHash",
                type: "bytes32",
            },
        ],
        name: "createRequest",
        outputs: [
            {
                internalType: "bytes32",
                name: "_requestId",
                type: "bytes32",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: "uint96",
                        name: "nonce",
                        type: "uint96",
                    },
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
                internalType: "struct IOracle.Request[]",
                name: "_requestsData",
                type: "tuple[]",
            },
            {
                internalType: "bytes32[]",
                name: "_ipfsHashes",
                type: "bytes32[]",
            },
        ],
        name: "createRequests",
        outputs: [
            {
                internalType: "bytes32[]",
                name: "_batchRequestsIds",
                type: "bytes32[]",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_id",
                type: "bytes32",
            },
        ],
        name: "disputeCreatedAt",
        outputs: [
            {
                internalType: "uint256",
                name: "_disputeCreatedAt",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_responseId",
                type: "bytes32",
            },
        ],
        name: "disputeOf",
        outputs: [
            {
                internalType: "bytes32",
                name: "_disputeId",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: "uint96",
                        name: "nonce",
                        type: "uint96",
                    },
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
                internalType: "struct IOracle.Request",
                name: "_request",
                type: "tuple",
            },
            {
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
                    {
                        internalType: "bytes",
                        name: "response",
                        type: "bytes",
                    },
                ],
                internalType: "struct IOracle.Response",
                name: "_response",
                type: "tuple",
            },
            {
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
                internalType: "struct IOracle.Dispute",
                name: "_dispute",
                type: "tuple",
            },
        ],
        name: "disputeResponse",
        outputs: [
            {
                internalType: "bytes32",
                name: "_disputeId",
                type: "bytes32",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_disputeId",
                type: "bytes32",
            },
        ],
        name: "disputeStatus",
        outputs: [
            {
                internalType: "enum IOracle.DisputeStatus",
                name: "_status",
                type: "uint8",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: "uint96",
                        name: "nonce",
                        type: "uint96",
                    },
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
                internalType: "struct IOracle.Request",
                name: "_request",
                type: "tuple",
            },
            {
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
                    {
                        internalType: "bytes",
                        name: "response",
                        type: "bytes",
                    },
                ],
                internalType: "struct IOracle.Response",
                name: "_response",
                type: "tuple",
            },
            {
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
                internalType: "struct IOracle.Dispute",
                name: "_dispute",
                type: "tuple",
            },
        ],
        name: "escalateDispute",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: "uint96",
                        name: "nonce",
                        type: "uint96",
                    },
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
                internalType: "struct IOracle.Request",
                name: "_request",
                type: "tuple",
            },
            {
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
                    {
                        internalType: "bytes",
                        name: "response",
                        type: "bytes",
                    },
                ],
                internalType: "struct IOracle.Response",
                name: "_response",
                type: "tuple",
            },
        ],
        name: "finalize",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_requestId",
                type: "bytes32",
            },
        ],
        name: "finalizedAt",
        outputs: [
            {
                internalType: "uint256",
                name: "_finalizedAt",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_requestId",
                type: "bytes32",
            },
        ],
        name: "finalizedResponseId",
        outputs: [
            {
                internalType: "bytes32",
                name: "_finalizedResponseId",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_requestId",
                type: "bytes32",
            },
        ],
        name: "getResponseIds",
        outputs: [
            {
                internalType: "bytes32[]",
                name: "_ids",
                type: "bytes32[]",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_requestId",
                type: "bytes32",
            },
            {
                internalType: "address",
                name: "_user",
                type: "address",
            },
        ],
        name: "isParticipant",
        outputs: [
            {
                internalType: "bool",
                name: "_isParticipant",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
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
        name: "listRequestIds",
        outputs: [
            {
                internalType: "bytes32[]",
                name: "_list",
                type: "bytes32[]",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "_requestNumber",
                type: "uint256",
            },
        ],
        name: "nonceToRequestId",
        outputs: [
            {
                internalType: "bytes32",
                name: "_id",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: "uint96",
                        name: "nonce",
                        type: "uint96",
                    },
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
                internalType: "struct IOracle.Request",
                name: "_request",
                type: "tuple",
            },
            {
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
                    {
                        internalType: "bytes",
                        name: "response",
                        type: "bytes",
                    },
                ],
                internalType: "struct IOracle.Response",
                name: "_response",
                type: "tuple",
            },
        ],
        name: "proposeResponse",
        outputs: [
            {
                internalType: "bytes32",
                name: "_responseId",
                type: "bytes32",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_id",
                type: "bytes32",
            },
        ],
        name: "requestCreatedAt",
        outputs: [
            {
                internalType: "uint256",
                name: "_requestCreatedAt",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: "uint96",
                        name: "nonce",
                        type: "uint96",
                    },
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
                internalType: "struct IOracle.Request",
                name: "_request",
                type: "tuple",
            },
            {
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
                    {
                        internalType: "bytes",
                        name: "response",
                        type: "bytes",
                    },
                ],
                internalType: "struct IOracle.Response",
                name: "_response",
                type: "tuple",
            },
            {
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
                internalType: "struct IOracle.Dispute",
                name: "_dispute",
                type: "tuple",
            },
        ],
        name: "resolveDispute",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_id",
                type: "bytes32",
            },
        ],
        name: "responseCreatedAt",
        outputs: [
            {
                internalType: "uint256",
                name: "_responseCreatedAt",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "totalRequestCount",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: "uint96",
                        name: "nonce",
                        type: "uint96",
                    },
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
                internalType: "struct IOracle.Request",
                name: "_request",
                type: "tuple",
            },
            {
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
                    {
                        internalType: "bytes",
                        name: "response",
                        type: "bytes",
                    },
                ],
                internalType: "struct IOracle.Response",
                name: "_response",
                type: "tuple",
            },
            {
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
                internalType: "struct IOracle.Dispute",
                name: "_dispute",
                type: "tuple",
            },
            {
                internalType: "enum IOracle.DisputeStatus",
                name: "_status",
                type: "uint8",
            },
        ],
        name: "updateDisputeStatus",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
] as const;
