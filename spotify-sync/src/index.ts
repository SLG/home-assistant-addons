import cors from 'cors';
import express from 'express';
import { readFileSync, writeFileSync } from 'fs';
import SpotifyWebApi from 'spotify-web-api-node';
import { PlaylistSyncService } from './playlistSync';

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;
const playlistId = process.env.PLAYLIST_ID;
const market = process.env.MARKET_ID;

const spotifyApi = new SpotifyWebApi({ clientId, clientSecret, redirectUri });
const playlistSyncService = new PlaylistSyncService(spotifyApi, playlistId, market);

let code;

const app = express();
app.use(cors());

app.get('/', async (req, res) => {
    try {
        code = req.query.code || null;
        await login();
        res.sendStatus(200);
    } catch (err) {
        console.error('Something went wrong when retrieving an access token', err);
        res.sendStatus(500);
    }
});

app.get('/run', async (req, res) => {
    try {
        await login();
        playlistSyncService.playlistSync().catch(err => console.error('Failed to do my job', err));
        res.sendStatus(200);
    } catch (err) {
        const authorizeURL = getCode();
        res.send(`Authorize yourself with this url: ${authorizeURL}`);
    }
});

app.get('/stats', (_, res) => {
    res.send(playlistSyncService.getStats());
});

app.get('/reset', (_, res) => {
    res.send(playlistSyncService.reset());
});

function getCode(): string {
    return spotifyApi.createAuthorizeURL(['user-library-read', 'user-library-modify', 'playlist-modify-private', 'playlist-modify-public', 'user-read-recently-played'], 'my-random-state');
}

interface Codes {
    accessToken: string;
    refreshToken: string;
}

function retrieveOldCodes(): Codes | undefined {
    try {
        const prevCodes = JSON.parse(readFileSync('/data/accesscodes.txt').toString());
        if (prevCodes) {
            return prevCodes;
        }
    } catch (err: any) {
    }
    return undefined;
}

function writeCodes(codes: Codes): void {
    writeFileSync('/data/accesscodes.txt', JSON.stringify(codes));
}

async function login(): Promise<void> {
    if (!spotifyApi.getRefreshToken()) {
        try {
            const oldCodes = retrieveOldCodes();
            if (oldCodes) {
                spotifyApi.setAccessToken(oldCodes.accessToken);
                spotifyApi.setRefreshToken(oldCodes.refreshToken);
            } else if (code) {
                const data = await spotifyApi.authorizationCodeGrant(code);
                console.log('The access token expires in ' + data.body['expires_in']);

                const newCodes: Codes = { accessToken: data.body['access_token'], refreshToken: data.body['refresh_token'] };

                writeCodes(newCodes);

                spotifyApi.setAccessToken(newCodes.accessToken);
                spotifyApi.setRefreshToken(newCodes.refreshToken);
            } else {
                console.log('Authorize yourself with this url:', getCode());
                return Promise.reject('No code');
            }
        } catch (err) {
            console.error('Something went wrong when retrieving an access token', err);
        }
    } else {
        try {
            const data = await spotifyApi.refreshAccessToken();
            spotifyApi.setAccessToken(data.body['access_token']);
        } catch (err) {
            console.error('Something went wrong when refreshing an access token', err);
        }
    }
}

console.log('Listening on 8833');
app.listen(8833);
login().then(() => console.log('Logged in!')).catch(err => console.error('Failed to log in', err.message));
