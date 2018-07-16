const path = require('path');

module.exports = {
	entry: "./index.js",
	output: {
        library: 'bigiot',
		path: __dirname + "/dist",
		filename: "bigiot.js",
	},
}
