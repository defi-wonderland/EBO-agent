import { EBORequestCreator_ChainNotAdded } from "../exceptions/chainNotAdded.exception.js";
import { EBORequestCreator_InvalidEpoch } from "../exceptions/invalidEpoch.exception.js";
import { Oracle_InvalidRequestBody } from "../exceptions/invalidRequestBody.exception.js";
import { EBORequestModule_InvalidRequester } from "../exceptions/invalidRequester.exception.js";

/**
 * A factory class for creating specific error instances based on the provided error name.
 */
export class ErrorFactory {
    /**
     * Creates an instance of a specific error class based on the provided error name.
     *
     * @param {string} errorName - The name of the error to create.
     * @returns {Error} An instance of the corresponding error class.
     * @throws {Error} If the provided error name is unknown.
     */
    public static createError(errorName: string): Error {
        // TODO: need to define structure of each error
        // TODO: Need to define some base contract reverted error to distinguish from other errors
        switch (errorName) {
            case "EBORequestCreator_InvalidEpoch":
                return new EBORequestCreator_InvalidEpoch();
            case "Oracle_InvalidRequestBody":
                return new Oracle_InvalidRequestBody();
            case "EBORequestModule_InvalidRequester":
                return new EBORequestModule_InvalidRequester();
            case "EBORequestCreator_ChainNotAdded":
                return new EBORequestCreator_ChainNotAdded();
                // TODO: refactor all errors to be in a map & use new error factory rather than a new class for each
                // case "AccountExtension_InsufficientFunds":
                // case "AccountingExtensions_NotAllowed":
                // case "BondedResponseModule_AlreadyResponded":
                // case "BondedResponseModule_TooLateToPropose":
                // case "Oracle_AlreadyFinalized":
                // case "ValidatorLib_InvalidResponseBody":
                // case "ArbitratorModule_InvalidArbitrator":
                // case "BondEscalationAccounting_AlreadySettled":
                // case "BondEscalationAccounting_InsufficientFunds":
                // case "AccountingExtension_UnauthorizedModule":
                // case "Oracle_CannotEscalate":
                // case "Oracle_InvalidDisputeId":
                // case "Oracle_InvalidDispute":
                // case "BondEscalationModule_NotEscalatable":
                // case "BondEscalationModule_BondEscalationNotOver":
                // case "BondEscalationModule_BondEscalationOver":
                // case "AccountingExtension_InsufficientFunds":
                // case "BondEscalationModule_DisputeWindowOver":
                // case "Oracle_ResponseAlreadyDisputed":
                // case "Oracle_InvalidDisputeBody":
                // case "Oracle_InvalidResponse":
                // case "ValidatorLib_InvalidDisputeBody":
                // case "Validator_InvalidDispute":
                // case "EBORequestModule_InvalidRequest":
                // case "EBOFinalityModule_InvalidRequester":
                // case "Oracle_InvalidFinalizedResponse":
                // case "Oracle_FinalizableResponseExists":
                return new Error(`Contract reverted: ${errorName}`);
            default:
                return new Error(`Unknown error: ${errorName}`);
        }
    }
}
