BIG IoT JavaScript library [![Build Status](https://travis-ci.org/flowhub/bigiot-js.svg?branch=master)](https://travis-ci.org/flowhub/bigiot-js) [![Coverage Status](https://coveralls.io/repos/github/flowhub/bigiot-js/badge.svg)](https://coveralls.io/github/flowhub/bigiot-js) [![Greenkeeper badge](https://badges.greenkeeper.io/flowhub/bigiot-js.svg)](https://greenkeeper.io/)
==========================

This module aims to provide a JavaScript library for interacting with the [BIG IoT marketplace](https://market.big-iot.org/).

## Features

* Registering an offering in the marketplace
* Validating the JWT token presented by an offering subscriber
* Subscribing to an offering

## Planned features

* Unregistering an offering from the marketplace
* Discovering offerings from the marketplace

## Installation

Simply install this module with NPM:

```shell
$ npm install bigiot-js --save
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

The offering registration is timeboxed and will expire by default in ten minutes, so for persistent offerings you should keep re-registering the offering in a timer loop.

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

## Usage for consumers

Prerequisites:

* Log into the [BIG IoT Marketplace](https://market.big-iot.org) (or another compatible marketplace instance)
* Register your company and a new consumer
* Copy the consumer ID and secret from the marketplace UI

### Authenticating with the marketplace

Once you've completed the above steps, you can use this library. Instantiate a consumer with:

```javascript
const bigiot = require('bigiot-js');
const consumer = new bigiot.provider(consumerId, consumerSecret);
```

Then you need to authenticate your consumer with the marketplace:

```javascript
provider.authenticate()
  .then(() => {
    // Code to run after successful authentication
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
