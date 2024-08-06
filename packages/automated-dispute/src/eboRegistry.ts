import { Dispute, Request, Response } from "./types/prophet.js";

class EboRegistry {
    private requests: Map<string, Request>;
    private responses: Map<string, Response>;
    private dispute: Map<string, Dispute>;

    constructor() {}
}
