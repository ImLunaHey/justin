import 'reflect-metadata';
import 'dotenv/config';
import { logger } from '@app/common/logger';
import { Client } from 'tmi.js';

const connectedChannels = new Set<string>();
const joinedChannels = new Set<string>();
const usersJoined: Record<string, Set<string>> = {};

const client = new Client({
    channels: [...new Set([
        'joeykaotyk',       'avocadocannabis',  'bahtura',         'gamesdonequick',
        'xqc',              'limmy',            'thedevdad_',      'esl_australia',
        'themercy15',       'Tfue',             'NICKMERCS',       'shroud',
        'Myth',             'Summit1g',         'Ninja',           'timthetatman',
        'DrDisrespect',     'xQcOW',            'lirik',           'Pokimane',
        'Rubius',           'TSM_Daequan',      'dakotaz',         'Syndicate',
        'Gotaga',           'sodapoppin',       'DrLupo',          'CohhCarnage',
        'Nightblue3',       'Yassuo',           'Dyrus',           'pokelawls',
        'Sips_',            'castro_1021',      'KingGothalion',   'imaqtpie',
        'faker',            'Riot Games',       'ESL_CSGO',        'TwitchRivals',
        'pokimane',         'Asmongold',        'Sodapoppin',      'noahj456',
        'TSM_Myth',         'RiotGames2',       'CDNThe3rd',       'RocketLeague',
        'summit1g',         'Twitch',           'PlayHearthstone', 'jasonr',
        'LIRIK',            'ESL_SC2',          'DrDisRespect',    'Shroud',
        'iWillDominate',    'RiotGamesBrazil',  'Fortnite',        'DrDisrespectLIVE',
        'loltyler1',        'LCK_Korea',        'DansGaming',      'EsfandTV',
        'Gaules',           'VGBootCamp',       'PGL_DOTA2',       'TSM_Viss',
        'YoDa',             'BlastPremier',     'Doublelift',      'Gorgc',
        'ESL_LOL',          'WTSGxJeemzz',      'JoshOG',          'GamesDoneQuick',
        'OverwatchLeague',  'TheSushiDragon',   'FortniteFR',      'Cowsep',
        'ELEAGUETV',        'Starladder_CS_en', 'TimTheTatman',    'OgamingLoL',
        'hiko',             'RiotGamesJP',      'ninja',           'NairoMK',
        'Fextralife',       'BeyondTheSummit',  'ShoxTV',          'LOLITOFDEZ',
        'Pokelawls',        'TSM_ZexRow',       'Slayerage',       'cizzorz',
        'RiotGamesOceania', 'RiotGamesTurkish', 'nymn',             'ludwig',
        'pewdiepie'
    ]).values()],
});

client.on('join', (channel, username, self) => {
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

client.on('subscription', (channel, username, method, message, userstate) => {
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

client.on('raided', (channel, username, viewers) => {
    logger.info('raid', {
        meta: {
            channel,
            username,
            viewers,
        },
    });
});

client.on('messagedeleted', (channel, username, deletedMessage, userstate) => {
    logger.info('message-deleted', {
        meta: {
            username,
            channel,
            'deleted-message': deletedMessage,
            'user-state': userstate,
        },
    });
});

client.on('message', (channel, tags, message, self) => {
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
    void client.join(tags.username).catch((error: unknown) => {
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

// eslint-disable-next-line @typescript-eslint/require-await
export const main = async () => {
    logger.info('Application started');

    // Connect to top streamers
    await client.connect();
};
