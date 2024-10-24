import { Caip2ChainId } from "@ebo-agent/shared";
import { Address, decodeAbiParameters, encodeAbiParameters } from "viem";

import { Request, Response } from "../types/prophet.js";

const REQUEST_MODULE_DATA_REQUEST_ABI_FIELDS = [
    {
        components: [
            { name: "epoch", type: "uint256" },
            { name: "chainId", type: "string" },
            { name: "accountingExtension", type: "address" },
            { name: "paymentAmount", type: "uint256" },
        ],
        name: "requestModuleData",
        type: "tuple",
    },
] as const;

const RESPONSE_MODULE_DATA_REQUEST_ABI_FIELDS = [
    {
        components: [
            { name: "accountingExtension", type: "address" },
            { name: "bondToken", type: "address" },
            { name: "bondSize", type: "uint256" },
            { name: "deadline", type: "uint256" },
            { name: "disputeWindow", type: "uint256" },
        ],
        name: "responseModuleData",
        type: "tuple",
    },
] as const;

const DISPUTE_MODULE_DATA_REQUEST_ABI_FIELDS = [
    {
        components: [
            { name: "accountingExtension", type: "address" },
            { name: "bondToken", type: "address" },
            { name: "bondSize", type: "uint256" },
            { name: "maxNumberOfEscalations", type: "uint256" },
            { name: "bondEscalationDeadline", type: "uint256" },
            { name: "tyingBuffer", type: "uint256" },
            { name: "disputeWindow", type: "uint256" },
        ],
        name: "disputeModuleData",
        type: "tuple",
    },
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
            epoch: decodeParameters[0].epoch,
            chainId: decodeParameters[0].chainId as Caip2ChainId,
            accountingExtension: decodeParameters[0].accountingExtension as Address,
            paymentAmount: decodeParameters[0].paymentAmount,
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
        return encodeAbiParameters(REQUEST_MODULE_DATA_REQUEST_ABI_FIELDS, [requestModuleData]);
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

        return decodedParameters[0];
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
        return encodeAbiParameters(RESPONSE_MODULE_DATA_REQUEST_ABI_FIELDS, [responseModuleData]);
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

        return decodedParameters[0];
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
        return encodeAbiParameters(DISPUTE_MODULE_DATA_REQUEST_ABI_FIELDS, [disputeModuleData]);
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
