import 'reflect-metadata';
import 'dotenv/config';
import outdent from 'outdent';
import { setTimeout } from 'timers/promises';
import { logger } from '@app/common/logger';
import { Client as Twitch } from 'tmi.js';
import { Client as Axiom } from '@axiomhq/axiom-node';
import { env } from '@app/common/env';

const joiningChannels = new Set<string>();
const joinedChannels = new Set<string>();

const usersWatching: Record<string, Set<string>> = {};

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
        joinedChannels.add(channel);
    } else {
        // A user joined a channel we're already connected to
        if (!usersWatching[channel]) usersWatching[channel] = new Set();
        usersWatching[channel].add(username);
    }
});

twitch.on('subscription', (channel, username, method, message, userState) => {
    logger.info('subscription', {
        meta: {
            channel,
            username,
            method,
            message,
            'user-state': userState,
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
                'badge-info': undefined,
                badges: undefined,
                emotes: undefined,
            } satisfies typeof tags,
            message,
            self,
        }
    });

    if (!tags.username) return;

    // Mark this user as being watched in this channel
    if (!usersWatching[channel]) usersWatching[channel] = new Set();
    usersWatching[channel].add(tags.username);

    // // Mark this user as chatting in this channel
    // if (joinedChannels.has(tags.username)) return;
    // joinedChannels.add(tags.username);
    // void twitch.join(tags.username).catch((error: unknown) => {
    //     logger.error('join', {
    //         error,
    //         channel: tags.username,
    //     });
    // });
});

twitch.on('anonsubgift', (channel, streakMonths, recipient, methods, userstate) => {
    logger.info('anon-sub-gift', {
        meta: {
            streakMonths,
            channel,
            recipient,
            methods,
            'user-state': userstate,
        },
    });
});

twitch.on('anonsubmysterygift', (channel, numOfSubs, methods, userstate) => {
    logger.info('anon-sub-mystery-gift', {
        meta: {
            'number-of-subs': numOfSubs,
            channel,
            methods,
            'user-state': userstate,
        },
    });
});

twitch.on('emoteonly', (channel, enabled) => {
    logger.info('emote-only', {
        meta: {
            channel,
            enabled,
        },
    });
});

twitch.on('ban', (channel, username, userstate) => {
    logger.info('ban', {
        channel,
        username,
        'user-state': userstate,
    });
});

twitch.on('primepaidupgrade', (channel, username, methods, userstate) => {
    logger.info('prime-paid-upgrade', {
        channel,
        username,
        methods,
        'user-state': userstate,
    });
});

twitch.on('timeout', (channel, username, reason, duration, userstate) => {
    logger.info('timeout', {
        channel,
        username,
        reason,
        duration,
        'user-state': userstate,
    });
});

twitch.on('cheer', (channel, userstate) => {
    logger.info('cheer', {
        channel,
        'user-state': userstate,
    });
});

twitch.on('followersonly', (channel, enabled, length) => {
    logger.info('followers-only', {
        channel,
        enabled,
        length,
    });
});

twitch.on('mod', (channel, username) => {
    logger.info('mod', {
        channel,
        username,
    });
});

twitch.on('resub', (channel, username, months, message, userstate) => {
    logger.info('resub', {
        channel,
        username,
        months,
        message,
        userstate,
    });
});

twitch.on('subgift', (channel, username, streakMonths, recipient, methods, userstate) => {
    logger.info('subgift', {
        channel,
        username,
        streakMonths,
        recipient,
        methods,
        'user-state': userstate,
    });
});

const logStats = () => {
    logger.info('stats', {
        // How many channels we've attempted to join
        joining: joiningChannels.size,
        // How many channels we managed to join
        joined: joinedChannels.size,
        // How many users are being watched by us right now
        // We need to put every user in every channel into a big set first to prevent counting the user twice if they're watching multiple channels
        watching: Object.values(usersWatching).reduce((users, channel) => new Set([...users.values(), ...channel.values()]), new Set<string>()).size,
    });
};

// Every 10s log how many channels were listening to
setInterval(() => {
    logStats();
}, 10_000);

const axiom = new Axiom({
    token: env.AXIOM_TOKEN,
});

const fetchStreamers = async (limit: number) => {
    const joined = [...joinedChannels.values()];
    const query = outdent`
        twitch
        | where message =~ "message" ${joined.length > 0 ? `and ${joined.map(channel => `['meta.channel'] != "${channel}"`).join(' and ')}` : ''}
        | summarize messages=dcount(['meta.tags.username']) by bin_auto(_time), ['meta.channel']
        | limit ${limit}
    `;

    logger.info('axiom', {
        query
    });

    return axiom.query(query).then(response => {
        // Get just the channel name
        return response.buckets.series
            ?.find(series => series.groups !== null)
            ?.groups?.map(group => group.group['meta.channel'] as string) ?? [];
    })
    // Remove all the channel we've already joined
    .then(streamers => streamers.filter(channel => !joinedChannels.has(channel)))
    .catch(() => []);
}

const joinTopChannels = async (limit: number) => {
    // Fetch all the top streamers in terms of messages
    logger.info('Fetching streamers');
    const streamers = await fetchStreamers(limit);
    logger.info('Fetched streamers', {
        streamers,
    });

    // Join each of the channels
    for (const channel of streamers) {
        try {
            logger.info('joining', {
                channel
            });
            await twitch.join(channel);
        } catch (error: unknown) {
            logger.error('failed joining channel', {
                channel,
                error,
            });
        }
    }
};

// eslint-disable-next-line @typescript-eslint/require-await
export const main = async () => {
    logger.info('Application started');

    // Connect to IRC
    await twitch.connect();
    
    // Join the top 100 channels
    await joinTopChannels(100);

    // Wait 10 mins for the first 100 to settle
    await setTimeout(10 * (60 * 1_000));

    // Join the next top 100 channels
    await joinTopChannels(100);
};
