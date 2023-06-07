import { Logger } from '@ImLunaHey/logger';
import { z } from 'zod';

const channel = z.string();
const username = z.string();
const self = z.boolean();

export const logger = new Logger({
    service: 'app',
    schema: {
        info: {
            'Application started': z.never(),
            'Fetching streamers': z.never(),
            'Fetched streamers': z.object({
                streamers: z.array(z.string()),
            }),
            axiom: z.object({
                query: z.string(),
            }),
            joining: z.object({
                channel,
            }),
            join: z.object({
                meta: z.object({
                    channel,
                    username,
                    self,
                }),
            }),
            subscription: z.object({
                meta: z.object({
                    channel,
                    username,
                    method: z.object({
                        prime: z.boolean().optional(),
                        plan: z.enum(['Prime', '1000', '2000', '3000']).optional(),
                        planName: z.string().optional(),
                    }),
                    message: z.string(),
                    // TODO: Fill in this z.object
                    'user-state': z.object({}),
                }),
            }),
            raid: z.object({
                meta: z.object({
                    channel,
                    username,
                    viewers: z.number(),
                }),
            }),
            message: z.object({
                meta: z.object({
                    channel,
                    // TODO: Fill in this z.object
                    tags: z.object({}),
                    message: z.string(),
                    self: z.boolean(),
                })
            }),
            'message-deleted': z.object({
                meta: z.object({
                    username,
                    channel,
                    'deleted-message': z.string(),
                    // TODO: Fill in this z.object
                    'user-state': z.object({}),
                }),
            }),
            'anon-sub-gift': z.object({
                meta: z.object({
                    streakMonths: z.number(),
                    channel,
                    recipient: z.string(),
                    // TODO: Fill in this z.object
                    methods: z.object({}),
                    // TODO: Fill in this z.object
                    'user-state': z.object({}),
                }),
            }),
            // TODO: Fill in this z.object
            'anon-sub-mystery-gift': z.object({}),
            // TODO: Fill in this z.object
            'prime-paid-upgrade': z.object({}),
            // TODO: Fill in this z.object
            timeout: z.object({}),
            // TODO: Fill in this z.object
            ban: z.object({}),
            // TODO: Fill in this z.object
            'emote-only': z.object({}),
            // TODO: Fill in this z.object
            cheer: z.object({}),
            // TODO: Fill in this z.object
            subgift: z.object({}),
            // TODO: Fill in this z.object
            resub: z.object({}),
            // TODO: Fill in this z.object
            mod: z.object({}),
            // TODO: Fill in this z.object
            'followers-only': z.object({}),
            stats: z.object({
                joining: z.number(),
                joined: z.number(),
                watching: z.number(),
            }),
        },
        debug: {},
        warn: {},
        error: {
            // All errors must be passed an empty object or an object with fields
            'Application crashed': z.object({}),
            'failed joining channel': z.object({
                channel,
            }),
        },
    },
});
