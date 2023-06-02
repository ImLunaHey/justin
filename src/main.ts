import 'reflect-metadata';
import 'dotenv/config';
import outdent from 'outdent';
import { logger } from '@app/common/logger';
import { Client as Twitch } from 'tmi.js';
import { Client as Axiom } from '@axiomhq/axiom-node';
import { env } from '@app/common/env';

const connectedChannels = new Set<string>();
const joinedChannels = new Set<string>();
const usersJoined: Record<string, Set<string>> = {};

const twitch = new Twitch({
    channels: [
        // Only start in the creator's channel
        'ImLunaHey',
    ],
});

twitch.on('join', (channel, username, self) => {
    logger.info('join', {
        meta: {
            channel,
            username,
            self,    
        },
    });

    if (self) {
        // This bot joined a channel
        connectedChannels.add(channel);
    } else {
        // A user joined a channel we're already connected to
        if (!usersJoined[channel]) usersJoined[channel] = new Set();
        usersJoined[channel].add(username);
    }
});

twitch.on('subscription', (channel, username, method, message, userstate) => {
    logger.info('subscription', {
        meta: {
            channel,
            username,
            method,
            message,
            'user-state': userstate,
        },
    });
});

twitch.on('raided', (channel, username, viewers) => {
    logger.info('raid', {
        meta: {
            channel,
            username,
            viewers,
        },
    });
});

twitch.on('messagedeleted', (channel, username, deletedMessage, userstate) => {
    logger.info('message-deleted', {
        meta: {
            username,
            channel,
            'deleted-message': deletedMessage,
            'user-state': userstate,
        },
    });
});

twitch.on('message', (channel, tags, message, self) => {
    logger.info('message', {
        meta: {
            channel,
            tags: {
                ...tags,
                emotes: undefined,
            } satisfies typeof tags,
            message,
            self,
        }
    });

    if (!tags.username) return;
    if (joinedChannels.has(tags.username)) return;
    joinedChannels.add(tags.username);
    void twitch.join(tags.username).catch((error: unknown) => {
        logger.error('join', {
            error,
            channel: tags.username,
        });
    });
});

const logStats = () => {
    logger.info('channels', {
        // How many channels we've attempted to join
        joined: joinedChannels.size,
        // How many channels we managed to join
        connected: connectedChannels.size,
        // How many users are being watched by us right now
        watching: Object.values(usersJoined).reduce((total, users) => total + users.size, 0),
    });
};

// Every 10s log how many channels were listening to
setInterval(() => {
    logStats();
}, 10_000);

const axiom = new Axiom({
    token: env.AXIOM_TOKEN,
});

// eslint-disable-next-line @typescript-eslint/require-await
export const main = async () => {
    logger.info('Application started');
    
    // Fetch all the top streamers in terms of messages
    logger.info('Fetching streamers');
    const streamers = await axiom.query(outdent`
        twitch
        | where message =~ "message"
        | summarize messages=dcount(['meta.tags.username']) by bin_auto(_time), ['meta.channel']
        | limit 5
    `).then(response => {
        // Get just the channel name
        return response.buckets.series
            ?.find(series => series.groups !== null)
            ?.groups?.map(group => group.group['meta.channel'] as string) ?? [];
    }).catch(() => []);

    // Connect to IRC
    await twitch.connect();

    // Join each of the channels
    for (const channel of streamers) {
        await twitch.join(channel);
    }
};
