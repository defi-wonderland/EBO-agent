import { Branded } from "./brand.js";

/** Timestamp in seconds since the Unix epoch */
export type UnixTimestamp = Branded<bigint, "UnixTimestamp">;
