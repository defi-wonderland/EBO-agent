import { ILogger } from "@ebo-agent/shared";
import { Client, IntentsBitField } from "discord.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DiscordNotifier } from "../../src/services/index.js";
import mocks from "../mocks/index.js";

vi.mock("discord.js", async () => {
    const actualDiscord = await vi.importActual<typeof import("discord.js")>("discord.js");

    const MockClient = vi.fn(() => ({
        login: vi.fn().mockResolvedValue(undefined),
        once: vi.fn((event, callback) => {
            if (event === "ready") {
                callback();
            }
        }),
        channels: {
            fetch: vi.fn().mockResolvedValue({
                isTextBased: () => true,
                send: vi.fn().mockResolvedValue(undefined),
            }),
        },
    }));

    class MockIntentsBitField {
        static Flags = actualDiscord.IntentsBitField.Flags;
        add() {
            return this;
        }
    }

    return {
        ...actualDiscord,
        Client: MockClient,
        IntentsBitField: MockIntentsBitField,
    };
});

describe("DiscordNotifier", () => {
    const mockConfig = {
        discordBotToken: "mock-token",
        discordChannelId: "mock-channel-id",
    };

    let notifier: DiscordNotifier;
    const logger: ILogger = mocks.mockLogger();

    beforeEach(async () => {
        vi.clearAllMocks();
        notifier = await DiscordNotifier.create(mockConfig, logger);
    });

    it("initializes the Discord client and login", async () => {
        const ClientMock = Client as unknown as vi.Mock;

        expect(ClientMock).toHaveBeenCalledWith({
            intents: expect.any(IntentsBitField),
        });

        const instance = ClientMock.mock.results[0].value;
        expect(instance.login).toHaveBeenCalledWith("mock-token");
        expect(instance.once).toHaveBeenCalledWith("ready", expect.any(Function));
    });

    it("sends an error message to the Discord channel", async () => {
        const error = new Error("Test error");
        const context = { key: "value" };

        await notifier.notifyError(error, context);

        const ClientMock = Client as unknown as vi.Mock;
        const clientInstance = ClientMock.mock.results[0].value;
        const fetchMock = clientInstance.channels.fetch as vi.Mock;

        expect(fetchMock).toHaveBeenCalledWith("mock-channel-id");

        const channel = await fetchMock.mock.results[0].value;
        expect(channel.isTextBased()).toBe(true);

        const sendMock = channel.send as vi.Mock;
        expect(sendMock).toHaveBeenCalledWith(expect.stringContaining("**Error:**"));
    });

    it("logs an error if the channel is not found", async () => {
        const ClientMock = Client as unknown as vi.Mock;
        const clientInstance = ClientMock.mock.results[0].value;
        clientInstance.channels.fetch.mockResolvedValueOnce(null);

        const error = new Error("Test error");
        const context = { key: "value" };

        await notifier.notifyError(error, context);

        expect(logger.error).toHaveBeenCalledWith(
            "Failed to send error notification to Discord: Error: Discord channel not found or is not text-based",
        );
    });

    it("formats the error message correctly", () => {
        const error = new Error("Test error message");
        error.name = "TestError";
        const context = { key: "value" };

        const formattedMessage = (notifier as any).formatErrorMessage(error, context);

        expect(formattedMessage).toContain("**Error:** TestError - Test error message");
        expect(formattedMessage).toContain("**Context:**");
        expect(formattedMessage).toContain(JSON.stringify(context, null, 2));
    });
});
