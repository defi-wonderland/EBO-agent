import { Client, IntentsBitField, TextChannel } from "discord.js";

import { NotificationService } from "./notificationService.js";

interface DiscordNotifierConfig {
    discordBotToken: string;
    discordChannelId: string;
}

/**
 * A notifier class for sending error notifications to a Discord channel.
 */
export class DiscordNotifier implements NotificationService {
    private client: Client;
    private config: DiscordNotifierConfig;

    private constructor(client: Client, config: DiscordNotifierConfig) {
        this.client = client;
        this.config = config;
    }

    /**
     * Creates an instance of the DiscordNotifier.
     * @param {DiscordNotifierConfig} config - The configuration object for the DiscordNotifier.
     * @returns {Promise<DiscordNotifier>} A promise that resolves to a DiscordNotifier instance.
     */
    public static async create(config: DiscordNotifierConfig): Promise<DiscordNotifier> {
        const intents = new IntentsBitField().add(
            IntentsBitField.Flags.Guilds,
            IntentsBitField.Flags.GuildMessages,
        );
        const client = new Client({ intents });

        try {
            await client.login(config.discordBotToken);
            await new Promise<void>((resolve) => {
                client.once("ready", () => {
                    console.log("Discord bot is ready");
                    resolve();
                });
            });
        } catch (error) {
            console.error("Failed to initialize Discord notifier:", error);
            throw error;
        }

        return new DiscordNotifier(client, config);
    }

    /**
     * Sends an error notification to the specified Discord channel.
     * @param {Error} error - The error to notify about.
     * @param {any} context - Additional context information.
     * @returns {Promise<void>} A promise that resolves when the message is sent.
     */
    public async notifyError(error: Error, context: any): Promise<void> {
        try {
            const channel = await this.client.channels.fetch(this.config.discordChannelId);
            if (!channel || !channel.isTextBased()) {
                throw new Error("Discord channel not found or is not text-based");
            }
            const errorMessage = this.formatErrorMessage(error, context);
            await (channel as TextChannel).send(errorMessage);
            console.log("Error notification sent to Discord");
        } catch (err) {
            console.error("Failed to send error notification to Discord:", err);
            throw err;
        }
    }

    /**
     * Formats the error message to be sent to Discord.
     * @param {Error} error - The error object.
     * @param {any} context - Additional context information.
     * @returns {string} The formatted error message.
     */
    private formatErrorMessage(error: Error, context: any): string {
        return `**Error:** ${error.name} - ${error.message}\n**Context:**\n\`\`\`json\n${JSON.stringify(
            context,
            null,
            2,
        )}\n\`\`\``;
    }
}
