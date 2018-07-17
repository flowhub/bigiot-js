const path = require('path');

module.exports = {
	entry: {
        bigiot: "./index.js",
        browsertests: './spec/browser/consumer.js',
    },
	output: {
        library: 'bigiot',
		path: __dirname + "/dist",
		filename: "[name].js",
	},
}
