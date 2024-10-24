import { EboRegistry } from "../interfaces/index.js";
import { Dispute, EboEvent, EboEventName, Request, Response } from "./index.js";

export type BaseErrorStrategy = {
    shouldNotify: boolean;
    shouldTerminate: boolean;
    shouldReenqueue: boolean;
    customAction?: (context: any) => Promise<void> | void;
};

export type EventReactError = BaseErrorStrategy & {
    shouldReenqueue?: boolean;
};

export type TimeBasedError = BaseErrorStrategy;

export type ErrorHandlingStrategy = BaseErrorStrategy;

export interface ErrorContext {
    request: Request;
    response?: Response;
    dispute?: Dispute;
    event?: EboEvent<EboEventName>;
    registry: EboRegistry;
    reenqueueEvent?: () => void;
    terminateActor?: () => void;
}

export type ErrorName =
    | "UnknownError"
    | "Oracle_InvalidProposer"
    | "Oracle_ResponseAlreadyProposed"
    | "Oracle_InvalidDisputer"
    | "ValidatorLib_InvalidResponseBody"
    | "BondEscalationAccounting_InsufficientFunds"
    | "BondEscalationAccounting_AlreadySettled"
    | "BondEscalationModule_InvalidDispute"
    | "AccountingExtension_InsufficientFunds"
    | "Oracle_InvalidDisputeId"
    | "Oracle_InvalidDispute"
    | "Oracle_InvalidDisputeBody"
    | "Oracle_AlreadyFinalized"
    | "EBORequestModule_InvalidRequester"
    | "EBORequestModule_ChainNotAdded"
    | "EBORequestCreator_InvalidEpoch"
    | "Oracle_InvalidRequestBody"
    | "EBORequestCreator_RequestAlreadyCreated"
    | "Oracle_InvalidRequest"
    | "Oracle_InvalidResponseBody"
    | "AccountingExtension_NotAllowed"
    | "BondedResponseModule_AlreadyResponded"
    | "BondedResponseModule_TooLateToPropose"
    | "Oracle_CannotEscalate"
    | "Validator_InvalidDispute"
    | "ValidatorLib_InvalidDisputeBody"
    | "EBOFinalityModule_InvalidRequester"
    | "Oracle_InvalidFinalizedResponse"
    | "Oracle_InvalidResponse"
    | "Oracle_FinalizableResponseExists"
    | "ArbitratorModule_InvalidArbitrator"
    | "AccountingExtension_UnauthorizedModule"
    | "BondEscalationModule_NotEscalatable"
    | "BondEscalationModule_BondEscalationNotOver"
    | "BondEscalationModule_BondEscalationOver"
    | "BondEscalationModule_DisputeWindowOver"
    | "Oracle_ResponseAlreadyDisputed"
    | "BondEscalationModule_CannotBreakTieDuringTyingBuffer"
    | "BondEscalationModule_CanOnlySurpassByOnePledge"
    | "BondEscalationModule_MaxNumberOfEscalationsReached"
    | "Oracle_NotDisputeOrResolutionModule"
    | "BondEscalationModule_ShouldBeEscalated"
    | "BondEscalationModule_BondEscalationCantBeSettled";
