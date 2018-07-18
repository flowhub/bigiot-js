BIG IoT JavaScript library [![Build Status](https://travis-ci.org/flowhub/bigiot-js.svg?branch=master)](https://travis-ci.org/flowhub/bigiot-js) [![Coverage Status](https://coveralls.io/repos/github/flowhub/bigiot-js/badge.svg)](https://coveralls.io/github/flowhub/bigiot-js) [![Greenkeeper badge](https://badges.greenkeeper.io/flowhub/bigiot-js.svg)](https://greenkeeper.io/)
==========================

This module provides a JavaScript library for interacting with the [BIG IoT marketplace](https://market.big-iot.org/).

## Features

* Discovering offerings from the marketplace
* Subscribing to an offering and receiving data from the provider
* Registering an offering in the marketplace
* Validating the JWT token presented by an offering subscriber
* Supports Node.js (provider,consumer) and browser (consumer only)

## Planned features

* Unregistering an offering from the marketplace

## Installation

Simply install this module with NPM:

```shell
$ npm install bigiot-js --save
```

## Usage for consumers

Prerequisites:

* Log into the [BIG IoT Marketplace](https://market.big-iot.org) (or another compatible marketplace instance)
* Register your company and a new consumer
* Copy the consumer ID and secret from the marketplace UI

A number of examples are available:

* [Simple consumer](https://github.com/flowhub/bigiot-js/blob/master/example/consumer.js) (Node.js)
* [Consumer with a dynamic offering discovery](https://github.com/flowhub/bigiot-js/blob/master/example/consumer_discover.js) (Node.js)
* [Simple consumer for browser](./example/consumer.html)

We recomment using Webpack to include bigiot also in browser applications.
But you may also use the prebuilt .js file, either:

* Latest: `https://flowhub.github.io/bigiot-js/bigiot.js`
* Versioned: `https://flowhub.github.io/bigiot-js/$VERSION/bigiot.js`

### Authenticating with the marketplace

Once you've completed the above steps, you can use this library. Instantiate a consumer with:

```javascript
const bigiot = require('bigiot-js');
const consumer = new bigiot.consumer(consumerId, consumerSecret);
```

Then you need to authenticate your consumer with the marketplace:

```javascript
consumer.authenticate()
  .then(() => {
    // Code to run after successful authentication
  });
```

### Specifying a CORS proxy (browser)

As of July 2018, the Marketplace API does not allow Cross-Origin-Request-Sharing.
To work around this, a CORS proxy like [cors-anywhere](https://github.com/Rob--W/cors-anywhere) must be used.

```javascript
const bigiot = require('bigiot-js');
const marketplace = undefined;
const corsproxy = 'https://mycors.example.org';
const consumer = new bigiot.consumer(consumerId, consumerSecret, marketplace, corsproxy);
```


### Discovering available offerings

You can look up offerings in the marketplace. But for more dynamic applications, it is also possible to discover them based on various criteria.

For example, to discover all parking site offerings, you can do the following:

```javascript
const query = new bigiot.offering('Parking sites', 'urn:big-iot:ParkingSiteCategory');
// If you don't care about specifics on price and location, you can remove those
delete query.license;
delete query.price;
delete query.extent;

// Then get list of matching offerings
consumer.discover(query)
  .then((matchingOfferings) => {
    // Loop through the offerings can subscribe
  });
```

### Subscribing to a known offering

When you've found a data offering [from the marketplace](https://market.big-iot.org/allOfferings?onlyActive), you need to make a subscription in order to access it.

```javascript
consumer.subscribe('Offering ID here')
  .then((subscription) => {
    // Now you're subscribed. You can use the subscription details to make calls to the offering
    consumer.access(subscription, inputData);
  });
```

The input data above is a JSON structure fulfilling whatever input parameters the offering requires.

**Note:** many Java BIG IoT providers utilize a self-signed invalid SSL certificate. This will be rejected by default. To allow requests to these providers, set:

```javascript
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
```

## Usage for providers

Prerequisites:

* Log into the [BIG IoT Marketplace](https://market.big-iot.org) (or another compatible marketplace instance)
* Register your company and a new provider
* Copy the provider ID and secret from the marketplace UI

See [a simple provider example](https://github.com/flowhub/bigiot-js/blob/master/example/provider.js), and the [NoFlo](https://noflojs.org) integration in the [bigiot-bridge repository](https://github.com/flowhub/bigiot-bridge).

### Authenticating with the marketplace

Once you've completed the above steps, you can use this library. Instantiate a provider with:

```javascript
const bigiot = require('bigiot-js');
const provider = new bigiot.provider(providerId, providerSecret);
```

Then you need to authenticate your provider with the marketplace:

```javascript
provider.authenticate()
  .then(() => {
    // Code to run after successful authentication
  });
```

### Defining your offering

```javascript
// Instantiate an offering of the desired type
const offering = new bigiot.offering(offeringName, offeringRdfType);

// Define the HTTP endpoint consumers should call on your service
offering.endpoints = {
  uri: 'http://example.net/some/path',
};

// Define the geographical extent of your offering
offering.extent = {
  city: 'Berlin',
};

// Define the input parameters your offering accepts, if any
offering.inputData = [
  {
    name: 'latitude',
    rdfUri: 'http://schema.org/latitude',
  },
  {
    name: 'longitude',
    rdfUri: 'http://schema.org/longitude',
  },
]

// Define the data structure your offering returns when called
offering.outputData = [
  {
    name: "temperature",
    rdfUri: 'http://schema.org/airTemperatureValue',
  }
];
```

Once you're happy with the offering description, you can register it with the marketplace with:

```javascript
provider.register(offering)
  .then(() => {
    // Code to run after successful registration
  });
```

The offering registration is timeboxed and will expire by default in ten minutes, so for persistent offerings you should call the activate method in a timer loop and update the expiration time regularly.

### Validating subscriber JSON Web Tokens

Subscribers that make requests to your offering will present a HTTP Bearer token signed with your provider secret. You can validate it with:

```javascript
provider.validateToken(token)
  .catch((err) => {
    // Give a 403 response because token is invalid or expired
  })
  .then(() => {
    // Token is valid
  });
```
