export const stringify = (a: unknown) =>
    JSON.stringify(a, (_k, val) => (typeof val === "bigint" ? val.toString() : val));
