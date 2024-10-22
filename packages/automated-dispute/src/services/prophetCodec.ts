import { Caip2ChainId } from "@ebo-agent/shared";
import {
    Address,
    decodeAbiParameters,
    DecodeAbiParametersErrorType,
    encodeAbiParameters,
    EncodeAbiParametersErrorType,
} from "viem";

import { Request, Response } from "../types/prophet.js";

const REQUEST_MODULE_DATA_REQUEST_ABI_FIELDS = [
    { name: "epoch", type: "uint256" },
    { name: "chainId", type: "string" },
    { name: "accountingExtension", type: "address" },
    { name: "paymentAmount", type: "uint256" },
] as const;

const RESPONSE_MODULE_DATA_REQUEST_ABI_FIELDS = [
    { name: "accountingExtension", type: "address" },
    { name: "bondToken", type: "address" },
    { name: "bondSize", type: "uint256" },
    { name: "deadline", type: "uint256" },
    { name: "disputeWindow", type: "uint256" },
] as const;

const DISPUTE_MODULE_DATA_REQUEST_ABI_FIELDS = [
    { name: "accountingExtension", type: "address" },
    { name: "bondToken", type: "address" },
    { name: "bondSize", type: "uint256" },
    { name: "maxNumberOfEscalations", type: "uint256" },
    { name: "bondEscalationDeadline", type: "uint256" },
    { name: "tyingBuffer", type: "uint256" },
    { name: "disputeWindow", type: "uint256" },
] as const;

const RESPONSE_RESPONSE_ABI_FIELDS = [{ name: "block", type: "uint256" }] as const;

/** Class to encode/decode Prophet's structs into/from a byte array */
export class ProphetCodec {
    /**
     * Decodes the request's request module data bytes into an object.
     *
     * @param {Request["prophetData"]["requestModuleData"]} requestModuleData - The request module data bytes.
     * @throws {DecodeAbiParametersErrorType}
     * @returns {Request["decodedData"]["requestModuleData"]} A decoded object with requestModuleData properties.
     */
    static decodeRequestRequestModuleData(
        requestModuleData: Request["prophetData"]["requestModuleData"],
    ): Request["decodedData"]["requestModuleData"] {
        const decodeParameters = decodeAbiParameters(
            REQUEST_MODULE_DATA_REQUEST_ABI_FIELDS,
            requestModuleData,
        );

        return {
            epoch: decodeParameters[0],
            chainId: decodeParameters[1] as Caip2ChainId,
            accountingExtension: decodeParameters[2] as Address,
            paymentAmount: decodeParameters[3],
        };
    }

    /**
     * Encodes the request's request module data object into bytes.
     *
     * @param {Request["decodedData"]["requestModuleData"]} requestModuleData - The request's request module data object
     * @throws {EncodeAbiParametersErrorType}
     * @returns {Request["prophetData"]["requestModuleData"]} A byte-encoded request module data object
     */

    static encodeRequestRequestModuleData(
        requestModuleData: Request["decodedData"]["requestModuleData"],
    ): Request["prophetData"]["requestModuleData"] {
        return encodeAbiParameters(REQUEST_MODULE_DATA_REQUEST_ABI_FIELDS, [
            requestModuleData.epoch,
            requestModuleData.chainId,
            requestModuleData.accountingExtension,
            requestModuleData.paymentAmount,
        ]);
    }

    /**
     * Decodes the request's response module data bytes into an object.
     *
     * @param {Request["prophetData"]["responseModuleData"]} responseModuleData - The response module data bytes.
     * @throws {DecodeAbiParametersErrorType}
     * @returns {Request["decodedData"]["responseModuleData"]} A decoded object with responseModuleData properties.
     */
    static decodeRequestResponseModuleData(
        responseModuleData: Request["prophetData"]["responseModuleData"],
    ): Request["decodedData"]["responseModuleData"] {
        const decodedParameters = decodeAbiParameters(
            RESPONSE_MODULE_DATA_REQUEST_ABI_FIELDS,
            responseModuleData,
        );

        return {
            accountingExtension: decodedParameters[0],
            bondToken: decodedParameters[1],
            bondSize: decodedParameters[2],
            deadline: decodedParameters[3],
            disputeWindow: decodedParameters[4],
        };
    }

    /**
     * Encodes the request's response module data object into bytes.
     *
     * @param {Request["decodedData"]["responseModuleData"]} responseModuleData - The request's response module data object
     * @throws {EncodeAbiParametersErrorType}
     * @returns {Request["prophetData"]["responseModuleData"]} A byte-encoded response module data object
     */
    static encodeRequestResponseModuleData(
        responseModuleData: Request["decodedData"]["responseModuleData"],
    ): Request["prophetData"]["responseModuleData"] {
        return encodeAbiParameters(RESPONSE_MODULE_DATA_REQUEST_ABI_FIELDS, [
            responseModuleData.accountingExtension,
            responseModuleData.bondToken,
            responseModuleData.bondSize,
            responseModuleData.deadline,
            responseModuleData.disputeWindow,
        ]);
    }

    /**
     * Decodes the request's dispute module data bytes into an object.
     *
     * @param {Request["prophetData"]["disputeModuleData"]} disputeModuleData - The dispute module data bytes.
     * @throws {DecodeAbiParametersErrorType}
     * @returns {Request["decodedData"]["disputeModuleData"]} A decoded object with disputeModuleData properties.
     */
    static decodeRequestDisputeModuleData(
        disputeModuleData: Request["prophetData"]["disputeModuleData"],
    ): Request["decodedData"]["disputeModuleData"] {
        const decodedParameters = decodeAbiParameters(
            DISPUTE_MODULE_DATA_REQUEST_ABI_FIELDS,
            disputeModuleData,
        );

        return {
            accountingExtension: decodedParameters[0],
            bondToken: decodedParameters[1],
            bondSize: decodedParameters[2],
            maxNumberOfEscalations: decodedParameters[3],
            bondEscalationDeadline: decodedParameters[4],
            tyingBuffer: decodedParameters[5],
            disputeWindow: decodedParameters[6],
        };
    }

    /**
     * Encodes the request's dispute module data object into bytes.
     *
     * @param {Request["decodedData"]["disputeModuleData"]} disputeModuleData - The request's dispute module data object
     * @throws {EncodeAbiParametersErrorType}
     * @returns {Request["prophetData"]["disputeModuleData"]} A byte-encoded dispute module data object
     */
    static encodeRequestDisputeModuleData(
        disputeModuleData: Request["decodedData"]["disputeModuleData"],
    ): Request["prophetData"]["disputeModuleData"] {
        return encodeAbiParameters(DISPUTE_MODULE_DATA_REQUEST_ABI_FIELDS, [
            disputeModuleData.accountingExtension,
            disputeModuleData.bondToken,
            disputeModuleData.bondSize,
            disputeModuleData.maxNumberOfEscalations,
            disputeModuleData.bondEscalationDeadline,
            disputeModuleData.tyingBuffer,
            disputeModuleData.disputeWindow,
        ]);
    }

    /**
     * Encodes a response object into bytes.
     *
     * @param {Response["decodedData"]["response"]} response - The response object to encode.
     * @throws {EncodeAbiParametersErrorType}
     * @returns {Response["prophetData"]["response"]} Byte-encoded response body.
     */
    static encodeResponse(
        response: Response["decodedData"]["response"],
    ): Response["prophetData"]["response"] {
        return encodeAbiParameters(RESPONSE_RESPONSE_ABI_FIELDS, [response.block]);
    }

    /**
     * Decodes a response body bytes into an object.
     *
     * @param {Response["prophetData"]["response"]} response - The response body bytes.
     * @throws {DecodeAbiParametersErrorType}
     * @returns {Response["decodedData"]["response"]} Decoded response body object.
     */
    static decodeResponse(
        response: Response["prophetData"]["response"],
    ): Response["decodedData"]["response"] {
        const decodedParameters = decodeAbiParameters(RESPONSE_RESPONSE_ABI_FIELDS, response);

        return {
            block: decodedParameters[0],
        };
    }
}
