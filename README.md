[![Build Status](https://secure.travis-ci.org/widdix/node-route53-updater.png)](http://travis-ci.org/widdix/node-route53-updater)
[![NPM version](https://badge.fury.io/js/route53-updater.png)](http://badge.fury.io/js/route53-updater)
[![NPM dependencies](https://david-dm.org/widdix/node-route53-updater.png)](https://david-dm.org/widdix/node-route53-updater)

# route53-updater

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
