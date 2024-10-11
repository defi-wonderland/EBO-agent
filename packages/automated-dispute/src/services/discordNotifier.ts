import { ILogger } from "@ebo-agent/shared";
import { Client, IntentsBitField, TextChannel } from "discord.js";
import { stringify } from "viem";

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
    private logger: ILogger;

    private constructor(client: Client, config: DiscordNotifierConfig, logger: ILogger) {
        this.client = client;
        this.config = config;
        this.logger = logger;
    }

    /**
     * Creates an instance of the DiscordNotifier.
     * @param {DiscordNotifierConfig} config - The configuration object for the DiscordNotifier.
     * @param {ILogger} logger - The logger instance.
     * @returns {Promise<DiscordNotifier>} A promise that resolves to a DiscordNotifier instance.
     */
    public static async create(
        config: DiscordNotifierConfig,
        logger: ILogger,
    ): Promise<DiscordNotifier> {
        const intents = new IntentsBitField().add(
            IntentsBitField.Flags.Guilds,
            IntentsBitField.Flags.GuildMessages,
        );
        const client = new Client({ intents });

        try {
            await client.login(config.discordBotToken);
            await new Promise<void>((resolve) => {
                client.once("ready", () => {
                    logger.info("Discord bot is ready");
                    resolve();
                });
            });
        } catch (error) {
            logger.error(`FFailed to initialize Discord notifier: ${error}`);
            throw error;
        }

        return new DiscordNotifier(client, config, logger);
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
            this.logger.info("Error notification sent to Discord");
        } catch (err) {
            this.logger.error(`Failed to send error notification to Discord: ${err}`);
        }
    }

    /**
     * Formats the error message to be sent to Discord.
     * @param {Error} error - The error object.
     * @param {any} context - Additional context information.
     * @returns {string} The formatted error message.
     */
    private formatErrorMessage(error: Error, context: unknown): string {
        return `**Error:** ${error.name} - ${error.message}\n**Context:**\n\`\`\`json\n${stringify(
            context,
            null,
            2,
        )}\n\`\`\``;
    }
}
