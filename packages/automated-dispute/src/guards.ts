import { EboEvent, EboEventName } from "./types/index.js";

export const isRequestCreatedEvent = (
    event: EboEvent<EboEventName>,
): event is EboEvent<"RequestCreated"> => {
    return event.name === "RequestCreated";
};
