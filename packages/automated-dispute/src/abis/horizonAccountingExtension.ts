export const horizonAccountingExtensionAbi = [
    {
        type: "constructor",
        inputs: [
            {
                name: "_horizonStaking",
                type: "address",
                internalType: "contract IHorizonStaking",
            },
            {
                name: "_oracle",
                type: "address",
                internalType: "contract IOracle",
            },
            {
                name: "_grt",
                type: "address",
                internalType: "contract IERC20",
            },
            {
                name: "_arbitrable",
                type: "address",
                internalType: "contract IArbitrable",
            },
            {
                name: "_minThawingPeriod",
                type: "uint64",
                internalType: "uint64",
            },
            {
                name: "_maxUsersToCheck",
                type: "uint128",
                internalType: "uint128",
            },
            {
                name: "_authorizedCallers",
                type: "address[]",
                internalType: "address[]",
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
        name: "GRT",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract IERC20",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "HORIZON_STAKING",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract IHorizonStaking",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "MAX_USERS_TO_SLASH",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "uint32",
                internalType: "uint32",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "MAX_VERIFIER_CUT",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "uint32",
                internalType: "uint32",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "MIN_THAWING_PERIOD",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "uint64",
                internalType: "uint64",
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
        name: "approveModule",
        inputs: [
            {
                name: "_module",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "approvedModules",
        inputs: [
            {
                name: "_user",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "_approvedModules",
                type: "address[]",
                internalType: "address[]",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "authorizedCallers",
        inputs: [
            {
                name: "_caller",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "_authorized",
                type: "bool",
                internalType: "bool",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "bond",
        inputs: [
            {
                name: "_bonder",
                type: "address",
                internalType: "address",
            },
            {
                name: "_requestId",
                type: "bytes32",
                internalType: "bytes32",
            },
            {
                name: "",
                type: "address",
                internalType: "contract IERC20",
            },
            {
                name: "_amount",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "_sender",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "bond",
        inputs: [
            {
                name: "_bonder",
                type: "address",
                internalType: "address",
            },
            {
                name: "_requestId",
                type: "bytes32",
                internalType: "bytes32",
            },
            {
                name: "",
                type: "address",
                internalType: "contract IERC20",
            },
            {
                name: "_amount",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "bondedForRequest",
        inputs: [
            {
                name: "_bonder",
                type: "address",
                internalType: "address",
            },
            {
                name: "_requestId",
                type: "bytes32",
                internalType: "bytes32",
            },
        ],
        outputs: [
            {
                name: "_amount",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "claimEscalationReward",
        inputs: [
            {
                name: "_disputeId",
                type: "bytes32",
                internalType: "bytes32",
            },
            {
                name: "_pledger",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "disputeBalance",
        inputs: [
            {
                name: "_disputeId",
                type: "bytes32",
                internalType: "bytes32",
            },
        ],
        outputs: [
            {
                name: "_balance",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "escalationResults",
        inputs: [
            {
                name: "_disputeId",
                type: "bytes32",
                internalType: "bytes32",
            },
        ],
        outputs: [
            {
                name: "requestId",
                type: "bytes32",
                internalType: "bytes32",
            },
            {
                name: "amountPerPledger",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "bondSize",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "bondEscalationModule",
                type: "address",
                internalType: "contract IBondEscalationModule",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getEscalationResult",
        inputs: [
            {
                name: "_disputeId",
                type: "bytes32",
                internalType: "bytes32",
            },
        ],
        outputs: [
            {
                name: "_escalationResult",
                type: "tuple",
                internalType: "struct IHorizonAccountingExtension.EscalationResult",
                components: [
                    {
                        name: "requestId",
                        type: "bytes32",
                        internalType: "bytes32",
                    },
                    {
                        name: "amountPerPledger",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "bondSize",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "bondEscalationModule",
                        type: "address",
                        internalType: "contract IBondEscalationModule",
                    },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "maxUsersToCheck",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "uint128",
                internalType: "uint128",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "onSettleBondEscalation",
        inputs: [
            {
                name: "_request",
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
            {
                name: "_dispute",
                type: "tuple",
                internalType: "struct IOracle.Dispute",
                components: [
                    {
                        name: "disputer",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "proposer",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "responseId",
                        type: "bytes32",
                        internalType: "bytes32",
                    },
                    {
                        name: "requestId",
                        type: "bytes32",
                        internalType: "bytes32",
                    },
                ],
            },
            {
                name: "",
                type: "address",
                internalType: "contract IERC20",
            },
            {
                name: "_amountPerPledger",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "_winningPledgersLength",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "pay",
        inputs: [
            {
                name: "_requestId",
                type: "bytes32",
                internalType: "bytes32",
            },
            {
                name: "_payer",
                type: "address",
                internalType: "address",
            },
            {
                name: "_receiver",
                type: "address",
                internalType: "address",
            },
            {
                name: "",
                type: "address",
                internalType: "contract IERC20",
            },
            {
                name: "_amount",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "pledge",
        inputs: [
            {
                name: "_pledger",
                type: "address",
                internalType: "address",
            },
            {
                name: "_request",
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
            {
                name: "_dispute",
                type: "tuple",
                internalType: "struct IOracle.Dispute",
                components: [
                    {
                        name: "disputer",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "proposer",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "responseId",
                        type: "bytes32",
                        internalType: "bytes32",
                    },
                    {
                        name: "requestId",
                        type: "bytes32",
                        internalType: "bytes32",
                    },
                ],
            },
            {
                name: "",
                type: "address",
                internalType: "contract IERC20",
            },
            {
                name: "_amount",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "pledgerClaimed",
        inputs: [
            {
                name: "_requestId",
                type: "bytes32",
                internalType: "bytes32",
            },
            {
                name: "_pledger",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "_claimed",
                type: "bool",
                internalType: "bool",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "pledges",
        inputs: [
            {
                name: "_disputeId",
                type: "bytes32",
                internalType: "bytes32",
            },
        ],
        outputs: [
            {
                name: "_amount",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "release",
        inputs: [
            {
                name: "_bonder",
                type: "address",
                internalType: "address",
            },
            {
                name: "_requestId",
                type: "bytes32",
                internalType: "bytes32",
            },
            {
                name: "",
                type: "address",
                internalType: "contract IERC20",
            },
            {
                name: "_amount",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "revokeModule",
        inputs: [
            {
                name: "_module",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "setMaxUsersToCheck",
        inputs: [
            {
                name: "_maxUsersToCheck",
                type: "uint128",
                internalType: "uint128",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "slash",
        inputs: [
            {
                name: "_disputeId",
                type: "bytes32",
                internalType: "bytes32",
            },
            {
                name: "_usersToSlash",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "_maxUsersToCheck",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "totalBonded",
        inputs: [
            {
                name: "_user",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "_bonded",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "event",
        name: "BondEscalationSettled",
        inputs: [
            {
                name: "_requestId",
                type: "bytes32",
                indexed: false,
                internalType: "bytes32",
            },
            {
                name: "_disputeId",
                type: "bytes32",
                indexed: false,
                internalType: "bytes32",
            },
            {
                name: "_amountPerPledger",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "_winningPledgersLength",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "Bonded",
        inputs: [
            {
                name: "_requestId",
                type: "bytes32",
                indexed: true,
                internalType: "bytes32",
            },
            {
                name: "_bonder",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "_amount",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "EscalationRewardClaimed",
        inputs: [
            {
                name: "_requestId",
                type: "bytes32",
                indexed: true,
                internalType: "bytes32",
            },
            {
                name: "_disputeId",
                type: "bytes32",
                indexed: true,
                internalType: "bytes32",
            },
            {
                name: "_pledger",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "_reward",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "_released",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "MaxUsersToCheckSet",
        inputs: [
            {
                name: "_maxUsersToCheck",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "Paid",
        inputs: [
            {
                name: "_requestId",
                type: "bytes32",
                indexed: true,
                internalType: "bytes32",
            },
            {
                name: "_beneficiary",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "_payer",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "_amount",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "Pledged",
        inputs: [
            {
                name: "_pledger",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "_requestId",
                type: "bytes32",
                indexed: true,
                internalType: "bytes32",
            },
            {
                name: "_disputeId",
                type: "bytes32",
                indexed: true,
                internalType: "bytes32",
            },
            {
                name: "_amount",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "Released",
        inputs: [
            {
                name: "_requestId",
                type: "bytes32",
                indexed: true,
                internalType: "bytes32",
            },
            {
                name: "_beneficiary",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "_amount",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "WinningPledgersPaid",
        inputs: [
            {
                name: "_requestId",
                type: "bytes32",
                indexed: true,
                internalType: "bytes32",
            },
            {
                name: "_disputeId",
                type: "bytes32",
                indexed: true,
                internalType: "bytes32",
            },
            {
                name: "_winningPledgers",
                type: "address[]",
                indexed: true,
                internalType: "address[]",
            },
            {
                name: "_amountPerPledger",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "error",
        name: "HorizonAccountingExtension_AlreadyClaimed",
        inputs: [],
    },
    {
        type: "error",
        name: "HorizonAccountingExtension_AlreadySettled",
        inputs: [],
    },
    {
        type: "error",
        name: "HorizonAccountingExtension_FeeOnTransferToken",
        inputs: [],
    },
    {
        type: "error",
        name: "HorizonAccountingExtension_InsufficientBondedTokens",
        inputs: [],
    },
    {
        type: "error",
        name: "HorizonAccountingExtension_InsufficientFunds",
        inputs: [],
    },
    {
        type: "error",
        name: "HorizonAccountingExtension_InsufficientTokens",
        inputs: [],
    },
    {
        type: "error",
        name: "HorizonAccountingExtension_InvalidMaxVerifierCut",
        inputs: [],
    },
    {
        type: "error",
        name: "HorizonAccountingExtension_InvalidThawingPeriod",
        inputs: [],
    },
    {
        type: "error",
        name: "HorizonAccountingExtension_NoEscalationResult",
        inputs: [],
    },
    {
        type: "error",
        name: "HorizonAccountingExtension_NotAllowed",
        inputs: [],
    },
    {
        type: "error",
        name: "HorizonAccountingExtension_UnauthorizedCaller",
        inputs: [],
    },
    {
        type: "error",
        name: "HorizonAccountingExtension_UnauthorizedModule",
        inputs: [],
    },
    {
        type: "error",
        name: "HorizonAccountingExtension_UnauthorizedUser",
        inputs: [],
    },
    {
        type: "error",
        name: "Validator_InvalidDispute",
        inputs: [],
    },
    {
        type: "error",
        name: "Validator_InvalidResponse",
        inputs: [],
    },
] as const;
