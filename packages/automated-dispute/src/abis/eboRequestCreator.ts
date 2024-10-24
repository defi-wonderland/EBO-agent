export const eboRequestCreatorAbi = [
    {
        type: "constructor",
        inputs: [
            {
                name: "_oracle",
                type: "address",
                internalType: "contract IOracle",
            },
            {
                name: "_epochManager",
                type: "address",
                internalType: "contract IEpochManager",
            },
            {
                name: "_arbitrable",
                type: "address",
                internalType: "contract IArbitrable",
            },
            {
                name: "_requestData",
                type: "tuple",
                internalType: "struct IOracle.Request",
                components: [
                    {
                        name: "nonce",
                        type: "uint96",
                        internalType: "uint96",
                    },
                    {
                        name: "requester",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "requestModule",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "responseModule",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "disputeModule",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "resolutionModule",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "finalityModule",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "requestModuleData",
                        type: "bytes",
                        internalType: "bytes",
                    },
                    {
                        name: "responseModuleData",
                        type: "bytes",
                        internalType: "bytes",
                    },
                    {
                        name: "disputeModuleData",
                        type: "bytes",
                        internalType: "bytes",
                    },
                    {
                        name: "resolutionModuleData",
                        type: "bytes",
                        internalType: "bytes",
                    },
                    {
                        name: "finalityModuleData",
                        type: "bytes",
                        internalType: "bytes",
                    },
                ],
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "ARBITRABLE",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract IArbitrable",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "ORACLE",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract IOracle",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "START_EPOCH",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "addChain",
        inputs: [
            {
                name: "_chainId",
                type: "string",
                internalType: "string",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "createRequest",
        inputs: [
            {
                name: "_epoch",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "_chainId",
                type: "string",
                internalType: "string",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "epochManager",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract IEpochManager",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getAllowedChainIds",
        inputs: [],
        outputs: [
            {
                name: "_chainIds",
                type: "bytes32[]",
                internalType: "bytes32[]",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getRequestData",
        inputs: [],
        outputs: [
            {
                name: "_requestData",
                type: "tuple",
                internalType: "struct IOracle.Request",
                components: [
                    {
                        name: "nonce",
                        type: "uint96",
                        internalType: "uint96",
                    },
                    {
                        name: "requester",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "requestModule",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "responseModule",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "disputeModule",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "resolutionModule",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "finalityModule",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "requestModuleData",
                        type: "bytes",
                        internalType: "bytes",
                    },
                    {
                        name: "responseModuleData",
                        type: "bytes",
                        internalType: "bytes",
                    },
                    {
                        name: "disputeModuleData",
                        type: "bytes",
                        internalType: "bytes",
                    },
                    {
                        name: "resolutionModuleData",
                        type: "bytes",
                        internalType: "bytes",
                    },
                    {
                        name: "finalityModuleData",
                        type: "bytes",
                        internalType: "bytes",
                    },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "removeChain",
        inputs: [
            {
                name: "_chainId",
                type: "string",
                internalType: "string",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "requestData",
        inputs: [],
        outputs: [
            {
                name: "nonce",
                type: "uint96",
                internalType: "uint96",
            },
            {
                name: "requester",
                type: "address",
                internalType: "address",
            },
            {
                name: "requestModule",
                type: "address",
                internalType: "address",
            },
            {
                name: "responseModule",
                type: "address",
                internalType: "address",
            },
            {
                name: "disputeModule",
                type: "address",
                internalType: "address",
            },
            {
                name: "resolutionModule",
                type: "address",
                internalType: "address",
            },
            {
                name: "finalityModule",
                type: "address",
                internalType: "address",
            },
            {
                name: "requestModuleData",
                type: "bytes",
                internalType: "bytes",
            },
            {
                name: "responseModuleData",
                type: "bytes",
                internalType: "bytes",
            },
            {
                name: "disputeModuleData",
                type: "bytes",
                internalType: "bytes",
            },
            {
                name: "resolutionModuleData",
                type: "bytes",
                internalType: "bytes",
            },
            {
                name: "finalityModuleData",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "requestIdPerChainAndEpoch",
        inputs: [
            {
                name: "_chainId",
                type: "string",
                internalType: "string",
            },
            {
                name: "_epoch",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [
            {
                name: "_requestId",
                type: "bytes32",
                internalType: "bytes32",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "setDisputeModuleData",
        inputs: [
            {
                name: "_disputeModule",
                type: "address",
                internalType: "address",
            },
            {
                name: "_disputeModuleData",
                type: "tuple",
                internalType: "struct IBondEscalationModule.RequestParameters",
                components: [
                    {
                        name: "accountingExtension",
                        type: "address",
                        internalType: "contract IBondEscalationAccounting",
                    },
                    {
                        name: "bondToken",
                        type: "address",
                        internalType: "contract IERC20",
                    },
                    {
                        name: "bondSize",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "maxNumberOfEscalations",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "bondEscalationDeadline",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "tyingBuffer",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "disputeWindow",
                        type: "uint256",
                        internalType: "uint256",
                    },
                ],
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "setEpochManager",
        inputs: [
            {
                name: "_epochManager",
                type: "address",
                internalType: "contract IEpochManager",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "setFinalityModuleData",
        inputs: [
            {
                name: "_finalityModule",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "setRequestModuleData",
        inputs: [
            {
                name: "_requestModule",
                type: "address",
                internalType: "address",
            },
            {
                name: "_requestModuleData",
                type: "tuple",
                internalType: "struct IEBORequestModule.RequestParameters",
                components: [
                    {
                        name: "epoch",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "chainId",
                        type: "string",
                        internalType: "string",
                    },
                    {
                        name: "accountingExtension",
                        type: "address",
                        internalType: "contract IAccountingExtension",
                    },
                    {
                        name: "paymentAmount",
                        type: "uint256",
                        internalType: "uint256",
                    },
                ],
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "setResolutionModuleData",
        inputs: [
            {
                name: "_resolutionModule",
                type: "address",
                internalType: "address",
            },
            {
                name: "_resolutionModuleData",
                type: "tuple",
                internalType: "struct IArbitratorModule.RequestParameters",
                components: [
                    {
                        name: "arbitrator",
                        type: "address",
                        internalType: "address",
                    },
                ],
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "setResponseModuleData",
        inputs: [
            {
                name: "_responseModule",
                type: "address",
                internalType: "address",
            },
            {
                name: "_responseModuleData",
                type: "tuple",
                internalType: "struct IBondedResponseModule.RequestParameters",
                components: [
                    {
                        name: "accountingExtension",
                        type: "address",
                        internalType: "contract IAccountingExtension",
                    },
                    {
                        name: "bondToken",
                        type: "address",
                        internalType: "contract IERC20",
                    },
                    {
                        name: "bondSize",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "deadline",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "disputeWindow",
                        type: "uint256",
                        internalType: "uint256",
                    },
                ],
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "event",
        name: "ChainAdded",
        inputs: [
            {
                name: "_chainId",
                type: "string",
                indexed: true,
                internalType: "string",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "ChainRemoved",
        inputs: [
            {
                name: "_chainId",
                type: "string",
                indexed: true,
                internalType: "string",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "DisputeModuleDataSet",
        inputs: [
            {
                name: "_disputeModule",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "_disputeModuleData",
                type: "tuple",
                indexed: false,
                internalType: "struct IBondEscalationModule.RequestParameters",
                components: [
                    {
                        name: "accountingExtension",
                        type: "address",
                        internalType: "contract IBondEscalationAccounting",
                    },
                    {
                        name: "bondToken",
                        type: "address",
                        internalType: "contract IERC20",
                    },
                    {
                        name: "bondSize",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "maxNumberOfEscalations",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "bondEscalationDeadline",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "tyingBuffer",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "disputeWindow",
                        type: "uint256",
                        internalType: "uint256",
                    },
                ],
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "EpochManagerSet",
        inputs: [
            {
                name: "_epochManager",
                type: "address",
                indexed: true,
                internalType: "contract IEpochManager",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "FinalityModuleDataSet",
        inputs: [
            {
                name: "_finalityModule",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "_finalityModuleData",
                type: "bytes",
                indexed: false,
                internalType: "bytes",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "RequestCreated",
        inputs: [
            {
                name: "_requestId",
                type: "bytes32",
                indexed: true,
                internalType: "bytes32",
            },
            {
                name: "_request",
                type: "tuple",
                indexed: false,
                internalType: "struct IOracle.Request",
                components: [
                    {
                        name: "nonce",
                        type: "uint96",
                        internalType: "uint96",
                    },
                    {
                        name: "requester",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "requestModule",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "responseModule",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "disputeModule",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "resolutionModule",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "finalityModule",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "requestModuleData",
                        type: "bytes",
                        internalType: "bytes",
                    },
                    {
                        name: "responseModuleData",
                        type: "bytes",
                        internalType: "bytes",
                    },
                    {
                        name: "disputeModuleData",
                        type: "bytes",
                        internalType: "bytes",
                    },
                    {
                        name: "resolutionModuleData",
                        type: "bytes",
                        internalType: "bytes",
                    },
                    {
                        name: "finalityModuleData",
                        type: "bytes",
                        internalType: "bytes",
                    },
                ],
            },
            {
                name: "_epoch",
                type: "uint256",
                indexed: true,
                internalType: "uint256",
            },
            {
                name: "_chainId",
                type: "string",
                indexed: true,
                internalType: "string",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "RequestModuleDataSet",
        inputs: [
            {
                name: "_requestModule",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "_requestModuleData",
                type: "tuple",
                indexed: false,
                internalType: "struct IEBORequestModule.RequestParameters",
                components: [
                    {
                        name: "epoch",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "chainId",
                        type: "string",
                        internalType: "string",
                    },
                    {
                        name: "accountingExtension",
                        type: "address",
                        internalType: "contract IAccountingExtension",
                    },
                    {
                        name: "paymentAmount",
                        type: "uint256",
                        internalType: "uint256",
                    },
                ],
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "ResolutionModuleDataSet",
        inputs: [
            {
                name: "_resolutionModule",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "_resolutionModuleData",
                type: "tuple",
                indexed: false,
                internalType: "struct IArbitratorModule.RequestParameters",
                components: [
                    {
                        name: "arbitrator",
                        type: "address",
                        internalType: "address",
                    },
                ],
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "ResponseModuleDataSet",
        inputs: [
            {
                name: "_responseModule",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "_responseModuleData",
                type: "tuple",
                indexed: false,
                internalType: "struct IBondedResponseModule.RequestParameters",
                components: [
                    {
                        name: "accountingExtension",
                        type: "address",
                        internalType: "contract IAccountingExtension",
                    },
                    {
                        name: "bondToken",
                        type: "address",
                        internalType: "contract IERC20",
                    },
                    {
                        name: "bondSize",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "deadline",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "disputeWindow",
                        type: "uint256",
                        internalType: "uint256",
                    },
                ],
            },
        ],
        anonymous: false,
    },
    {
        type: "error",
        name: "EBORequestCreator_ChainAlreadyAdded",
        inputs: [],
    },
    {
        type: "error",
        name: "EBORequestCreator_ChainNotAdded",
        inputs: [],
    },
    {
        type: "error",
        name: "EBORequestCreator_InvalidEpoch",
        inputs: [],
    },
    {
        type: "error",
        name: "EBORequestCreator_InvalidNonce",
        inputs: [],
    },
    {
        type: "error",
        name: "EBORequestCreator_RequestAlreadyCreated",
        inputs: [],
    },
] as const;
