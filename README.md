BIG IoT JavaScript library [![Build Status](https://travis-ci.org/flowhub/bigiot-js.svg?branch=master)](https://travis-ci.org/flowhub/bigiot-js) [![Coverage Status](https://coveralls.io/repos/github/flowhub/bigiot-js/badge.svg)](https://coveralls.io/github/flowhub/bigiot-js) [![Greenkeeper badge](https://badges.greenkeeper.io/flowhub/bigiot-js.svg)](https://greenkeeper.io/)
==========================

This module aims to provide a JavaScript library for interacting with the [BIG IoT marketplace](https://market.big-iot.org/).

## Features

* Registering an offering in the marketplace

## Planned features

* Unregistering an offering from the marketplace
* Validating the JWT token presented by an offering subscriber
* Discovering offerings from the marketplace
* Subscribing to an offering

## Installation

Simply install this module with NPM.

## Usage for providers

Prerequisites:

* Log into the [BIG IoT Marketplace](https://market.big-iot.org) (or another compatible marketplace instance)
* Register your company and a new provider
* Copy the provider ID and secret from the marketplace UI

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

## Usage for consumers

TODO
