var assert = require("assert-plus");
var AWS = require("aws-sdk");
var async = require("async");
var underscore = require("underscore");
var os = require("os");

function retrieveHostedZoneId(name, cb) {
	"use strict";
	assert.string(name, "name");
	assert.func(cb, "cb");
	var route53 = new AWS.Route53(),
		hostedZones = [],
		nextMarker;
	async.whilst(
		function() {
			if (nextMarker === null) {
				return false;
			}
			return true;
		},
		function(cb) {
			route53.listHostedZones({
				"Marker": nextMarker,
				"MaxItems": "50"
			}, function(err, res) {
				if (err) {
					cb(err);
				} else {
					hostedZones = hostedZones.concat(underscore.filter(res.HostedZones, function(hostedZone) {
						return hostedZone.Name === name;
					}));
					if (res.IsTruncated === true) {
						nextMarker = res.NextMarker;
					} else {
						nextMarker = null;
					}
					cb();
				}
			});
		},
		function(err) {
			if (err) {
				cb(err);
			} else {
				if (hostedZones.length > 1) {
					cb(new Error("hostedZoneName not unique. Use hostedZoneId parameter."));
				} else if (hostedZones.length === 1) {
					cb(undefined, hostedZones[0].Id);
				} else {
					cb(new Error("hostedZoneName not found"));
				}
				
			}
		}
	);
}

function retrieveRecordSet(hostedZoneId, name, cb) {
	"use strict";
	assert.string(hostedZoneId, "hostedZoneId");
	assert.string(name, "name");
	assert.func(cb, "cb");
	var route53 = new AWS.Route53();
	route53.listResourceRecordSets({
		"HostedZoneId": hostedZoneId,
		"StartRecordName": name,
		"MaxItems": "1"
	}, function(err, res) {
		if (err) {
			cb(err);
		} else {
			cb(undefined, underscore.find(res.ResourceRecordSets, function(recordSet) {
				return recordSet.Name === name;
			}));
		}
	});
}

function checkINSYNC(changeInfo, cb) {
	"use strict";
	assert.object(changeInfo, "changeInfo");
	assert.string(changeInfo.Id, "changeInfo.Id");
	assert.string(changeInfo.Status, "changeInfo.Status");
	assert.func(cb, "cb");
	if (changeInfo.Status === "PENDING") {
		setTimeout(function() {
			var route53 = new AWS.Route53();
			route53.getChange({
				"Id": changeInfo.Id
			}, function(err ,res) {
				if (err) {
					cb(err);
				} else {
					checkINSYNC(res.ChangeInfo, cb);
				}
			});
	}, 5000);
	} else if (changeInfo.Status === "INSYNC") {
		cb();
	} else {
		cb(new Error("unsupported status " + changeInfo.Status));
	}
}

function deleteRecordSet(hostedZoneId, name, cb) {
	"use strict";
	assert.string(hostedZoneId, "hostedZoneId");
	assert.string(name, "name");
	assert.func(cb, "cb");
	var route53 = new AWS.Route53();
	retrieveRecordSet(hostedZoneId, name, function(err, recordSet) {
		if (err) {
			cb(err);
		} else {
			route53.changeResourceRecordSets({
				"ChangeBatch": {
					"Changes": [{
						"Action": "DELETE",
						"ResourceRecordSet": recordSet
					}],
					"Comment": "reoute53-updater deleteRecordSet()"
				},
				"HostedZoneId": hostedZoneId
			}, function(err, res) {
				if (err) {
					cb(err);
				} else {
					checkINSYNC(res.ChangeInfo, cb);
				}
			});
		}
	});
}

function createRecordSet(hostedZoneId, name, type, value, ttl, cb) {
	"use strict";
	assert.string(hostedZoneId, "hostedZoneId");
	assert.string(name, "name");
	assert.string(type, "type");
	assert.string(value, "value");
	assert.number(ttl, "ttl");
	assert.func(cb, "cb");
	var route53 = new AWS.Route53();
	route53.changeResourceRecordSets({
		"ChangeBatch": {
			"Changes": [{
				"Action": "CREATE",
				"ResourceRecordSet": {
					"Name": name,
					"Type": type,
					"TTL": ttl,
					"ResourceRecords": [{
						"Value": value
					}]
				}
			}],
			"Comment": "reoute53-updater createRecordSet()"
		},
		"HostedZoneId": hostedZoneId
	}, function(err, res) {
		if (err) {
			cb(err);
		} else {
			checkINSYNC(res.ChangeInfo, cb);
		}
	});
}

function updateRecordSet(hostedZoneId, name, type, value, ttl, cb) {
	"use strict";
	assert.string(hostedZoneId, "hostedZoneId");
	assert.string(name, "name");
	assert.string(type, "type");
	assert.string(value, "value");
	assert.number(ttl, "ttl");
	assert.func(cb, "cb");
	var route53 = new AWS.Route53();
	retrieveRecordSet(hostedZoneId, name, function(err, recordSet) {
		if (err) {
			cb(err);
		} else {
			var params = {
				"ChangeBatch": {
					"Changes": [],
					"Comment": "reoute53-updater updateRecordSet()"
				},
				"HostedZoneId": hostedZoneId
			};
			if (recordSet !== undefined) {
				params.ChangeBatch.Changes.push({
					"Action": "DELETE",
					"ResourceRecordSet": recordSet
				});
			}
			params.ChangeBatch.Changes.push({
				"Action": "CREATE",
				"ResourceRecordSet": {
					"Name": name,
					"Type": type,
					"TTL": ttl,
					"ResourceRecords": [{
						"Value": value
					}]
				}
			});
			route53.changeResourceRecordSets(params, function(err, res) {
				if (err) {
					cb(err);
				} else {
					checkINSYNC(res.ChangeInfo, cb);
				}
			});
		}
	});
}

function run(action, hostedZoneId, params, cb) {
	"use strict";
	if (action === "CREATE" || action === "UPDATE") {
		var issueUpdate = function(err, value) {
			if (err) {
				cb(err);
			} else {
				if (action === "CREATE") {
					createRecordSet(hostedZoneId, params.recordSetName, params.type || "CNAME", value, params.ttl || 60, cb);
				} else if (action === "UPDATE") {
					updateRecordSet(hostedZoneId, params.recordSetName, params.type || "CNAME", value, params.ttl || 60, cb);
				} 
			}
		};
		if (params.iface){
			var ifaces = os.networkInterfaces();
			var iface = ifaces[params.iface];
			if (iface === undefined) {
				cb(new Error("interface not found"));
			} else {
				assert.arrayOfObject(iface, "iface present");
				var ipv4 = underscore.find(iface, function(binding) { return binding.family === "IPv4"; });
				if (ipv4 === undefined) {
					cb(new Error("interface has no IPv4 address"));
				} else {
					issueUpdate(null, ipv4.address);
				}
			}
		} else {
			var mds = new AWS.MetadataService();
			mds.request("/latest/meta-data/" + (params.metadata || "public-hostname"), issueUpdate);
		}
	} else if (action === "DELETE") {
		deleteRecordSet(hostedZoneId, params.recordSetName, cb);
	} else {
		cb(new Error("action must be one of CREATE, UPDATE, or DELETE"));
	}
}

function input(action, params, cb) {
	"use strict";
	assert.string(action, "action");
	assert.optionalString(params.hostedZoneId, "params.hostedZoneId");
	assert.string(params.recordSetName, "params.recordSetName");
	assert.optionalNumber(params.ttl, "params.ttl");
	assert.optionalString(params.metadata, "params.metadata");
	assert.optionalString(params.type, "params.type");
	assert.optionalString(params.iface, "params.iface");
	assert.func(cb, "cb");
	if (params.hostedZoneId !== undefined) {
		run(action, params.hostedZoneId, params, cb);
	} else {
		assert.string(params.hostedZoneName, "params.hostedZoneName");
		retrieveHostedZoneId(params.hostedZoneName, function(err, hostedZoneId) {
			if (err) {
				cb(err);
			} else {
				run(action, hostedZoneId, params, cb);
			}
		});
	}
}

module.exports = input;
exports.retrieveHostedZoneId = retrieveHostedZoneId;
exports.retrieveRecordSet = retrieveRecordSet;
exports.deleteRecordSet = deleteRecordSet;
exports.createRecordSet = createRecordSet;
exports.updateRecordSet = updateRecordSet;
