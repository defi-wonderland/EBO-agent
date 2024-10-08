import { Dispute, EboEvent, EboEventName } from "./types/index.js";

export const isRequestCreatedEvent = (
    event: EboEvent<EboEventName>,
): event is EboEvent<"RequestCreated"> => {
    return event.name === "RequestCreated";
};

export function isDispute(
    dispute: Dispute | Dispute["prophetData"] | undefined,
): dispute is Dispute {
    return !!dispute && "id" in dispute;
}
