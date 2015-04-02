var assert = require("assert-plus");
var AWS = require("aws-sdk");
var async = require("async");
var underscore = require("underscore");

function retrieveHostedZone(name, cb) {
	"use strict";
	assert.string(name, "name");
	assert.func(cb, "cb");
	var route53 = new AWS.Route53(),
		hostedZone,
		nextMarker;
	async.whilst(
		function() {
			if (nextMarker === null) {
				return false;
			}
			if (hostedZone !== undefined) {
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
					hostedZone = underscore.find(res.HostedZones, function(hostedZone) {
						return hostedZone.Name === name;
					});
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
				cb(undefined, hostedZone);
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

function run(action, params, cb) {
	"use strict";
	assert.string(action, "action");
	assert.string(params.hostedZoneName, "params.hostedZoneName");
	assert.string(params.recordSetName, "params.recordSetName");
	assert.optionalNumber(params.ttl, "params.ttl");
	assert.optionalString(params.metadata, "params.metadata");
	assert.optionalString(params.type, "params.type");
	assert.func(cb, "cb");
	retrieveHostedZone(params.hostedZoneName, function(err, hostedZone) {
		if (err) {
			cb(err);
		} else {
			if (hostedZone === undefined) {
				cb(new Error("hostedZoneName not found"));
			} else {
				if (action === "CREATE" || action === "UPDATE") {
					var mds = new AWS.MetadataService();
					mds.request("/latest/meta-data/" + (params.metadata || "public-hostname"), function(err, value) {
						if (err) {
							cb(err);
						} else {
							if (action === "CREATE") {
								createRecordSet(hostedZone.Id, params.recordSetName, params.type || "CNAME", value, params.ttl || 60, cb);
							} else if (action === "UPDATE") {
								updateRecordSet(hostedZone.Id, params.recordSetName, params.type || "CNAME", value, params.ttl || 60, cb);
							} 
						}
					});
				} else if (action === "DELETE") {
					deleteRecordSet(hostedZone.Id, params.recordSetName, cb);
				} else {
					cb(new Error("action must be one of CREATE, UPDATE, DELETE"));
				}
			}
		}
	});
}

module.exports = run;
exports.retrieveHostedZone = retrieveHostedZone;
exports.retrieveRecordSet = retrieveRecordSet;
exports.deleteRecordSet = deleteRecordSet;
exports.createRecordSet = createRecordSet;
exports.updateRecordSet = updateRecordSet;
