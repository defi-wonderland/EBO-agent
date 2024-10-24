import { epochManagerAbi } from "@ebo-agent/automated-dispute";
import { Address, Chain, HttpTransport } from "viem";

import { AnvilClient } from "./anvil";

type SetEpochLengthInput = {
    client: AnvilClient<HttpTransport, Chain>;
    governorAddress: Address;
    epochManagerAddress: Address;
    length: bigint;
};

export const setEpochLength = async (params: SetEpochLengthInput) => {
    const { client, governorAddress, epochManagerAddress, length } = params;

    client.impersonateAccount({
        address: governorAddress,
    });

    const tx = await client.writeContract({
        address: epochManagerAddress,
        account: governorAddress,
        abi: epochManagerAbi,
        functionName: "setEpochLength",
        args: [length],
    });

    await client.waitForTransactionReceipt({ hash: tx });

    client.stopImpersonatingAccount({
        address: governorAddress,
    });
};

type GetEpochLengthInput = Omit<SetEpochLengthInput, "length">;

export const getEpochLength = async (params: GetEpochLengthInput) => {
    const { client, governorAddress, epochManagerAddress } = params;

    return await client.readContract({
        address: epochManagerAddress,
        account: governorAddress,
        abi: epochManagerAbi,
        functionName: "epochLength",
    });
};

type GetCurrentEpochInput = {
    client: AnvilClient<HttpTransport, Chain>;
    epochManagerAddress: Address;
};

export const getCurrentEpoch = async (params: GetCurrentEpochInput) => {
    const { client, epochManagerAddress } = params;

    return await client.readContract({
        address: epochManagerAddress,
        abi: epochManagerAbi,
        functionName: "currentEpoch",
    });
};
