const fs = require('fs');

function asModule(data) {
    const serialized = JSON.stringify(data, null, 2);
    return `module.exports = ${serialized}`;
}

// So that it will be avilable for browser tests without exposing in webpack-built module
const data = {
    id: process.env.BIGIOT_CONSUMER_ID,
    secret: process.env.BIGIOT_CONSUMER_SECRET,
};
const path = 'spec/browser/test.secrets.js';
fs.writeFileSync(path, asModule(data));

