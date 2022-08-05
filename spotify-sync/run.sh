#!/usr/bin/with-contenv bashio
set +u

export CLIENT_ID=$(bashio::config 'client_id')
export CLIENT_SECRET=$(bashio::config 'client_secret')
export REDIRECT_URI=$(bashio::config 'redirect_uri')
export PLAYLIST_ID=$(bashio::config 'playlist_id')
export MARKET=$(bashio::config 'market')

npm run start
