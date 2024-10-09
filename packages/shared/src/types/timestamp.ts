import { Branded } from "./brand.js";

/** Timestamp in seconds since the Unix epoch */
export type Timestamp = Branded<bigint, "Timestamp">;
