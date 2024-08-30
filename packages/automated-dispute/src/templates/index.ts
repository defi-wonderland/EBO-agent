import { RequestId } from "../types/prophet.js";

export const alreadyDeletedActorWarning = (requestId: RequestId) => `
Actor handling request ${requestId} was already deleted.

It is strongly suggested to check request status on-chain to be sure its responses and disputes have been correctly settled.,
`;

export const droppingUnhandledEventsWarning = (requestId: RequestId) => `
Dropping events for request ${requestId} because no actor is handling it and the first event the agent read is not a \`RequestCreated\` event.

The request likely started before the current epoch's first block, which will not be handled by the agent.
`;
