import { z } from "zod";

const ConfigSchema = z.object({
    DISCORD_BOT_TOKEN: z.string().min(1),
    DISCORD_CHANNEL_ID: z.string().min(1),
});

export const config = ConfigSchema.parse(process.env);
