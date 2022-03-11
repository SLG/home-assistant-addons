const express = require('express');
const fs = require('fs');

console.log('Initializing webservice.');
const webservice = express();

/**
 * API to retrieve mode of 1st location connected to Ring account. Returns JSON, mode has key 'mode'
 **/
webservice.get('/test', async (req, res) => {
    console.log('GET /test');
    res.send('Hello world!');
});

/**
 * Listen to defined port. Might be exposed differently depending on addon config.
 **/
console.log(`Starting listener on port 8833.`);
webservice.listen(8833, () => {
    console.log(`Ring Bridge is running on port 8833.`);
});
