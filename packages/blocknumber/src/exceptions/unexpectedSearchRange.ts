export class UnexpectedSearchRange extends Error {
    constructor(low: bigint, high: bigint) {
        super(
            `Lower bound of search range (${low}) must be less than or equal to upper bound (${high})`,
        );

        this.name = "UnexpectedSearchRange";
    }
}
