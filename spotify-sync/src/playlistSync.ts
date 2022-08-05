import { readFileSync, writeFileSync } from 'fs';
import SpotifyWebApi from 'spotify-web-api-node';

const syncFile = '/data/syncFile.txt';

export interface Stats {
    addedSongsSinceLastStats: number;
    lastSync: number;
    removedSongs: string[];
    removedSongsSinceLastStats: number;
}

export class PlaylistSyncService {
    private addedSongsSinceLastStats = 0;
    private removedSongs: string[] = [];
    private removedSongsSinceLastStats = 0;

    constructor(private spotifyWebApi: SpotifyWebApi, private playlistId: string, private market: string) {
    }

    getStats(): Stats {
        let lastSync: number;
        try {
            lastSync = new Date(readFileSync(syncFile).toString()).getTime()
        } catch (err: any) {
            lastSync = -1;
        }
        const stats: Stats = {
            lastSync,
            addedSongsSinceLastStats: this.addedSongsSinceLastStats,
            removedSongsSinceLastStats: this.removedSongsSinceLastStats,
            removedSongs: this.removedSongs,
        };
        this.addedSongsSinceLastStats = 0;
        this.removedSongsSinceLastStats = 0;
        this.removedSongs = [];
        return stats;
    }

    async playlistSync(): Promise<void> {
        let lastSync: Date;
        try {
            const lastDate = readFileSync(syncFile).toString();
            if (lastDate.length > 0) {
                lastSync = new Date(lastDate);
            } else {
                lastSync = new Date(0);
            }
        } catch (err: any) {
            lastSync = new Date(0);
        }
        console.log('Now', new Date());
        console.log('Last synced', lastSync);
        console.log('Remove recently played songs');
        const removedSongs = await this.removePlayedTracksFromPlaylist(lastSync);
        console.log('Add new saved songs');
        const newAddedSongs = await this.addNewSavedTracksToPlaylist(lastSync);
        writeFileSync(syncFile, `${new Date()}`);
        this.addedSongsSinceLastStats += newAddedSongs;
        this.removedSongsSinceLastStats += removedSongs;
    }

    private async addNewSavedTracksToPlaylist(lastSync?: Date): Promise<number> {
        let offset = 0;
        let addedSongs = 0;
        let changedSongs = 0;
        const limit = 50;
        while (true) {
            const removeFromSavedTracks = [];
            const addToSavedTracks = [];
            const removeFromSavedAlbums = [];
            const addToSavedAlbums = [];

            const mySavedTracks: SpotifyApi.UsersSavedTracksResponse = (await this.spotifyWebApi.getMySavedTracks({ limit, offset })).body;
            console.log('Got saved tracks');
            const newTracks = mySavedTracks.items
                .filter(item => lastSync ? new Date(item.added_at) > lastSync : true)
                .map(item => item.track);

            if (newTracks.length > 0) {
                const localTracks = (await this.spotifyWebApi.getTracks(newTracks.map(track => track.id), { market: this.market })).body.tracks;
                console.log('Got local tracks');

                const newTrackUris = [];

                const albumIds: Map<string, string> = new Map();

                for (let i = 0; i < newTracks.length; i++) {
                    const newTrack = newTracks[i];
                    const localNewTrack = localTracks[i];
                    if (localNewTrack.id !== newTrack.id) {
                        removeFromSavedTracks.push(newTrack.id);
                        addToSavedTracks.push(localNewTrack.id);
                        albumIds.set(newTrack.album.id, localNewTrack.album.id);
                        newTrackUris.push(localNewTrack.uri);
                    } else {
                        newTrackUris.push(newTrack.uri);
                    }
                }
                const keys = [...albumIds.keys()];
                if (keys.length > 0) {
                    (await this.spotifyWebApi.containsMySavedAlbums(keys)).body.forEach((isSaved, index) => {
                        if (isSaved) {
                            removeFromSavedAlbums.push(keys[index]);
                            addToSavedAlbums.push(albumIds.get(keys[index]));
                        }
                    });
                    console.log('Got saved albums');
                }

                await this.spotifyWebApi.addTracksToPlaylist(this.playlistId, newTrackUris);
                console.log('addTracksToPlaylist', newTrackUris.length);
                if (removeFromSavedTracks.length > 0) {
                    await this.spotifyWebApi.removeFromMySavedTracks(removeFromSavedTracks);
                }
                console.log('removeFromMySavedTracks', removeFromSavedTracks.length);
                if (addToSavedTracks.length > 0) {
                    await this.spotifyWebApi.addToMySavedTracks(addToSavedTracks);
                }
                console.log('addToMySavedTracks', addToSavedTracks.length);
                if (removeFromSavedAlbums.length > 0) {
                    await this.spotifyWebApi.removeFromMySavedAlbums(removeFromSavedAlbums);
                }
                console.log('removeFromMySavedAlbums', removeFromSavedAlbums.length);
                if (addToSavedAlbums.length > 0) {
                    await this.spotifyWebApi.addToMySavedAlbums(addToSavedAlbums);
                }
                console.log('addToMySavedAlbums', addToSavedAlbums.length);
            }
            addedSongs += newTracks.length;
            changedSongs += removeFromSavedTracks.length;
            if (newTracks.length < limit) {
                console.log(`Added ${addedSongs} and replaced ${changedSongs} songs`);
                return addedSongs;
            }
            await new Promise(res => setTimeout(() => res(''), 500));
            offset += limit;
        }
    }

    private async removePlayedTracksFromPlaylist(lastSync?: Date): Promise<number> {
        const mySavedTracks: SpotifyApi.UsersRecentlyPlayedTracksResponse = (await this.spotifyWebApi.getMyRecentlyPlayedTracks({ limit: 50 })).body;
        const playedTracks = mySavedTracks.items
            .filter(item => lastSync ? new Date(item.played_at) > lastSync : true);

        this.removedSongs = playedTracks
            .map(playedTrack => {
                const track = playedTrack.track as SpotifyApi.TrackObjectFull;
                return `${track.name} - ${track.album ? track.album.name : '???'} @ ${playedTrack.played_at}`;
            });

        const playedIds = playedTracks
            .map(item => ({ uri: item.track.uri }));

        const totalBefore = await this.spotifyWebApi.getPlaylistTracks(this.playlistId, { fields: 'total' });
        if (playedTracks.length > 0) {
            await this.spotifyWebApi.removeTracksFromPlaylist(this.playlistId, playedIds);
        }
        const totalAfter = await this.spotifyWebApi.getPlaylistTracks(this.playlistId, { fields: 'total' });
        console.log(`Removed ${totalBefore.body.total - totalAfter.body.total} played songs, with ${playedIds.length} played songs`);
        this.removedSongs.forEach(removedSong => console.log('-', removedSong));
        return totalBefore.body.total - totalAfter.body.total;
    }
}
