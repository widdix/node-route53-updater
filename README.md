[![Build Status](https://secure.travis-ci.org/widdix/node-route53-updater.png)](http://travis-ci.org/widdix/node-route53-updater)
[![NPM version](https://badge.fury.io/js/route53-updater.png)](http://badge.fury.io/js/route53-updater)
[![NPM dependencies](https://david-dm.org/widdix/node-route53-updater.png)](https://david-dm.org/widdix/node-route53-updater)

# route53-updater

The `route53-updater` module can update an Record Set with the current IP of an machine. This can be useful if you have a single instance running in an auto scaling group. During startup of the EC2 instance you call the `route53-updater` to update the DNS entry to the new IP.  

## CLI Usage

Install route53-updater globally

	npm install route53-updater -g

Create or update the DNS A entry for test.yourdomain.com to point to the public ip of the EC2 instance

	route53-updater --action UPDATE --hostedZoneName yourdomain.com. --recordSetName test.yourdomain.com. 

The assumed defaults are

	route53-updater --action UPDATE --hostedZoneName yourdomain.com. --recordSetName test.yourdomain.com. --ttl 300 --metadata local-ipv4 --type A

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
					"route53:ListResourceRecordSets"
				],
				"Resource": [
					"*"
				]
			}
		]
	}

Supported parameters:

* `action`: String
	* `UPDATE`: Update the DNS entry (delete if exists, and create)
	* `DELETE`: Create the DNS entry
	* `CREATE`: Create the DNS entry or fail if existing
* `hostedZoneName* : String - Name of your hosted zone (Must end with an dot!)
* `recordSetName`: String - Name of your record set (XYZ.hostedZoneName)
* `ttl`: Number - TTL in seconds (default 300)
* `metadata`: String - Metadata field to ue als the value (default ipv4-local, http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html )
* `type`: String - Type of record set (default A, http://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html )
