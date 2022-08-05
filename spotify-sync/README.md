# SpotifySync

Do you have many liked songs? And do you want to listen to them all? But keeps the randomizer keep playing the same songs?

SpotifySync is a tool to manage a single playlist with all your favourite songs, and will remove songs that are played recently. This
ensures that you will only hear "new" music.

# Usage

1. You have to create a [Spotify Dev](https://developer.spotify.com/dashboard/applications) account and create a (new) app
2. Create a client id and secret
3. Create a new playlist
4. Set up the addon with the information from above. For the redirect uri you have to use the ip of your Home Assistant, with port 8833,
   eg: http://homeassistant.local:8833
5. Press start

## Run every hour

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

# Known issues
Some songs can't be removed. This seems to have something to do with regions. When a song is not available in your region, it cannot be
removed via the API. This is kinda solved by looking for the correct song in your region, but it could still remain. When the number of
songs are low enough, you can remove them by hand.
