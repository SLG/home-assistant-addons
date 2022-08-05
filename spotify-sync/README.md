# SpotifySync
Do you have many liked songs? And do you want to listen to them all? But keeps the randomizer keep playing the same songs?

SpotifySync is a tool to manage a single playlist with all your favourite songs, and will remove songs that are played recently. This
ensures that you will only hear "new" music.

![](https://github.com/SLG/home-assistant-addons/raw/master/spotify-sync/screenshot.png)

## Usage
1. You have to create a [Spotify Dev](https://developer.spotify.com/dashboard/applications) account and create a (new) app
2. Retrieve the client id and secret
3. Create a new playlist, or reuse an existing one

### As Home Assistant addon
1. Set up the addon with the information from above. For the redirect uri you have to use the ip of your Home Assistant, with port 8833,
   eg: http://homeassistant.local:8833
2. Press start

### Standalone
1. Provide the environment variables
2. Run the Typescript code: `npm run start`

### Configuration
```yaml
CLIENT_ID: the client_id from your Spotify app 
CLIENT_SECRET: the client_secret from your Spotify app
REDIRECT_URI: the url where the application is running, e.g. http://localhost:8833
PLAYLIST_ID: the id of the playlist that you want to have managed
MARKET: the market key of your country, e.g. NL
```

If you do not know your market, you can retrieve the list with the command found [here](https://developer.spotify.com/documentation/web-api/reference/#/operations/get-available-markets).

### Run every hour
In your Home Assistant configuration:

```yaml
rest_command:
  run_spotify_sync:
    url: "http://localhost:8833/run"
```

And create an automation:

```yaml
alias: Run Spotify Sync every hour
description: ""
trigger:
  - platform: time_pattern
    minutes: "0"
condition: [ ]
action:
  - service: rest_command.run_spotify_sync
    data: { }
mode: single
```

### Optional sensor
If you want to know how many songs are removed, you can use something like this:
```yaml
  - platform: rest
    name: Spotify Sync
    resource: http://localhost:8833/stats
    scan_interval: 3600
    value_template: "{{ value_json.removedSongsSinceLastStats | int }}"
    json_attributes:
      - lastSync
      - addedSongsSinceLastStats
      - removedSongs
```

## Known issues
Some songs won't be removed. This seems to have something to do with regions. When a song is not available in your region, it cannot be
removed via the API. This is kinda solved by looking for the correct song in your region, but it could still remain. When the number of
songs are low enough, you can remove them by hand.
