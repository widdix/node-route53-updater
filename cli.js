#!/usr/bin/env node

var argv = require("minimist")(process.argv.slice(2));
var route53updater = require("./index.js");

route53updater(argv.action, argv, function(err) {
	"use strict";
	if (err) {
		console.error(err.message, err.stack);
		process.exit(1);
	} else {
		process.exit(0);
	}
});
