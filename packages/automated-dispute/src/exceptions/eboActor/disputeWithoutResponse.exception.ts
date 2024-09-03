import { Dispute } from "../../types/prophet.js";

export class DisputeWithoutResponse extends Error {
    constructor(dispute: Dispute) {
        super(`Response not found for dispute ${dispute.id}.`);
    }
}
