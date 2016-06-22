[![Build Status](https://secure.travis-ci.org/widdix/node-route53-updater.png)](http://travis-ci.org/widdix/node-route53-updater)
[![NPM version](https://badge.fury.io/js/route53-updater.png)](http://badge.fury.io/js/route53-updater)
[![NPM dependencies](https://david-dm.org/widdix/node-route53-updater.png)](https://david-dm.org/widdix/node-route53-updater)

# route53-updater

The `route53-updater` module can update a Route 53 Record Set with the current IP or hostname of an machine. This can be useful if you have a single instance running in an auto scaling group. During startup of the EC2 instance you call the `route53-updater` to update the DNS entry to the new IP.  

Port of https://github.com/taimos/route53-updater/

## Usage

Install route53-updater globally

	npm install route53-updater -g

Create or update the DNS CNAME entry for test.yourdomain.com to point to the public hostname of the EC2 instance

	route53-updater --action UPDATE --hostedZoneName yourdomain.com. --recordSetName test.yourdomain.com. 

or

	route53-updater --action UPDATE --hostedZoneId XXXXXXXXXXXXX --recordSetName test.yourdomain.com. 

The assumed defaults are

	route53-updater --action UPDATE --hostedZoneName yourdomain.com. --recordSetName test.yourdomain.com. --ttl 60 --metadata public-hostname --type CNAME

By default route53-updater will lookup the IP address against the Amazon Metadata Service. If running outside Amazon, you can use the first IPv4 address on an interface by specifying an --iface option

	route53-updater --action UPDATE --hostedZoneName yourdomain.com. --recordSetName test.yourdomain.com. --iface eth0

The instance running the script needs the following IAM access rights:

	{
		"Version": "2012-10-17",
		"Statement": [
			{
				"Sid": "Stmt1424083772000",
				"Effect": "Allow",
				"Action": [
					"route53:ChangeResourceRecordSets",
					"route53:ListHostedZones",
					"route53:ListResourceRecordSets",
					"route53:GetChange"
				],
				"Resource": [
					"*"
				]
			}
		]
	}

Supported parameters:

* `action`: String (required)
	* `UPDATE`: Update the DNS entry (delete if exists, and create)
	* `DELETE`: Create the DNS entry
	* `CREATE`: Create the DNS entry or fail if existing
* `hostedZoneName`: String (either `hostedZoneName` or `hostedZoneId` is required) - Name of your hosted zone (Must end with an dot!)
* `hostedZoneId`: String (either `hostedZoneName` or `hostedZoneId` is required) - Id of your hosted zone
* `recordSetName`: String (required) - Name of your record set (XYZ.hostedZoneName)
* `ttl`: Number (optional, default 60) - TTL in seconds
* `metadata`: String (optional, default public-hostname) - Metadata field to use as the value (http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html)
* `type`: String (optional, default CNAME) - Type of record set (http://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html)


## Breaking changes

### Update from 0.2.X to 1.0.X

No breaking changes!

### Update from 0.1.X to 0.2.X

Added `"route53:GetChange"` to the IAM access rights.
