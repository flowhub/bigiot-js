#!/usr/bin/env node

const https = require('https');
const fs = require('fs');

const bigiot = require('../');

function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}

function flatten(arr) {
  return arr.reduce(function (flat, toFlatten) {
    return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
  }, []);
}

function rdfTypes(fields) {
  var obj = {};
  for (var f of fields) {
    obj[f.name] = f.rdfAnnotation.uri;
  }
  return obj;
}

function htmlElement(type, attributes={}, children=[]) {
    if (attributes.className) {
        attributes.class = attributes.className;
        delete attributes.className;
    }

    if (!Array.isArray(children)) {
        children = [ children ];
    }

    const attrValues = Object.keys(attributes).map((a) => `${a}=${attributes[a].toString()}`);
    const attrs = attrValues.length ? ' ' + attrValues.join(' ') : '';
    const childs = children.map((c) => c.toString()).join('\n');
    return `<${type} ${attrs}>${childs}</${type}>`
}

const reportStyle = `
h2 {
  font-size: 18px;
}

.intro {
  font-size: 12px;
  padding-bottom: 10px;
}

tr {
  padding: 10px;  
}

thead td {
  padding-bottom: 5px;
  padding-left: 2px;
  padding-right: 10px;
  font-size: 18px;
}

tbody td {
  padding: 3px;
  font-size: 14px;
}

`

function renderHtml(results, style) {
  
  var rows = []; 

  const tr = (a, c) => htmlElement('tr', a, c)
  const td = (a, c) => htmlElement('td', a, c)
  const table = (a, c) => htmlElement('table', a, c)
  const thead = (a, c) => htmlElement('thead', a, c)
  const tds = (a, vals) => vals.map((v) => td(a, v))
  const e = htmlElement;

  const header = thead({},
                  tr({}, tds({}, ['Category',  'Provider', 'Offering', 'Data', 'SSL', 'CORS']))
  );

  // Puts error message in tooltip
  const errorElement = (errStr) => {
    return (errStr) ? `<span title="${errStr}">❌</span>` : `<span>✓</span>` 
  };

  for (var offering of results) {
    const offeringPieces = offering.offeringId.split('-');
    const offeringName = offeringPieces[offeringPieces.length-1];

    const items = [
      offering.category,
      offering.providerId,
      offeringName,
      errorElement(offering.fetchError),
      errorElement(offering.sslError),
      errorElement(offering.corsError)
    ];
    const row = tr({}, tds({}, items));
    rows.push(row);
  }

  const intro = e('section', { className: 'intro' }, [
    e('h2', {}, "BIG IoT offerings support for SSL and CORS"),
    e('p', {}, "For details of errors, hover over the X."),
    e('p', {}, "Notes: 1) Offerings may appear multiple times, if they are in multiple categories. 2) Some offerings require input parameters and fails when accessed by this tool."),
    e('p', {}, `Report generated using bigiotjs-check-offerings from <a href="https://github.com/flowhub/bigiot-js">bigiot-js</a>. Last updated: ${(new Date).toString()}.`),
  ])
  const body = e('body', {}, [
    intro,
    table({}, [ header, e('tbody', {}, rows) ]),
  ])

  const head = e('head', {}, [
    '<meta content="text/html;charset=utf-8" http-equiv="Content-Type">',
    htmlElement('style', {}, style),
  ]);
  return e('html', {}, [ head , body ]);
}

function renderCSV(results) {

  const quote = (s) => `"${s}"`
  const fields = [
    'offering', 'category', 'fetchError', 'sslError', 'corsError'
  ]
  const header = fields.map(quote).join(',');

  let rows = []
  for (var o of results) {

    const items = [
      o.offeringId,
      o.category,
      o.fetchError||'',
      o.sslError||'',
      o.corsError||'',
    ];
    const row = items.map(quote).join(',');
    rows.push(row);
  }

  return [].concat(header, rows).join("\n")
}

// Return relevant data about the offering
function processResults(fetchResults, category) {

  return fetchResults.map((r) => {
    const d = {
      offeringId: r.offering.id,
      providerId: r.offering.provider.id,
      organizationId: r.offering.provider.organization.id,
      active: r.offering.activation.status,
      endpoint: r.offering.endpoints[0].uri,
      license: r.offering.license,
      category: category,

      inputs: rdfTypes(r.offering.inputs),
      outputs: rdfTypes(r.offering.outputs),
      //data: r.data,
      fetchError: (r.error) ? r.error.message : null,
      sslError: (r.sslError) ? r.sslError.message : null,
      corsError: (r.corsError) ? r.corsError.message : null,
    };
    return d;
  });
}



// TODO: track access time
// TODO: support inputs
function checkOfferingAccess(consumer, offering) {
  const inputs = {};

  return consumer.subscribe(offering.id).then((subscription) => {

    var accessResult = {
      offering: offering,
      data: null,
      error: new Error('not checked'),
      sslError: new Error('not checked'),
      corsError: new Error('not checked'),
    };

    var ignoreSSLAgent = https.Agent({ rejectUnauthorized: false });

    // Try first without SSL
    consumer.options.httpAgent = ignoreSSLAgent;
    return consumer.access(subscription, inputs).then((data) => {
      accessResult.data = data;
    }).then(() => {
      // Try with SSL
      consumer.options.httpAgent = null;
      return consumer.access(subscription, inputs)
        .then(() => accessResult.sslError = null)
        .catch((err) => accessResult.sslError = err );
    }).then(() => {
      // Check CORS
      const url = subscription.offering.endpoints[0].uri;
      return fetch(url, { agent: ignoreSSLAgent }).then((response) => {
          const allowOrigin = response.headers._headers['access-control-allow-origin'];
          const allowMethods = response.headers._headers['access-control-allow-methods'];
          if (!allowOrigin) {
            throw new Error("Missing Access-Control-Allow-Origin header");
          }
          if (allowOrigin != '*') {
            throw new Error(`Only allowing origin '${allowOrigin}'`);
          }
          if (allowMethods) {
           if (allowMethods.indexOf('GET') == -1 || allowMethods.indexOf('OPTIONS')) {
            throw new Error(`Not allowing GET,OPTIONS methods: ${allowMethods}`);
           }
          }
      }).then(() => {
        accessResult.corsError = null;
      }).catch((err) => {
        accessResult.corsError = err;
      });
    }).then(() => {
      consumer.options.httpAgent = null;
      accessResult.error = null;
      return accessResult;
    }).catch((err) => {
      consumer.options.httpAgent = null;
      accessResult.error = err;
      return accessResult;
    });
  });
}


function subscribeAndFetch(consumer, category) {

  const name = category+'1';
  const query = new bigiot.offering(name, category);
  // No requirements
  delete query.license;
  delete query.extent;
  delete query.price;

  return consumer.discover(query)
  .then((allOfferings) => {
    return Promise.all(allOfferings.map((o) => checkOfferingAccess(consumer, o)))
  })
  .then((results) => {
    return processResults(results, category);
  })

}

const knownCategories = [
  'urn:big-iot:ChargingStationCategory',
  'urn:big-iot:BikeSharingStationCategory',
  'urn:big-iot:ParkingSpaceCategory',
  'urn:big-iot:TrafficDataCategory',
  'urn:big-iot:NoisePollutionIndicatorCategory',
  'urn:big-iot:WeatherIndicatorCategory',
  'urn:big-iot:COCategory',
  'urn:proposed:Traffic_Speed',
  'urn:big-iot:ParkingSiteCategory',
  'urn:big-iot:ParkingCategory',
  'urn:big-iot:MobilityFeatureCategory',
  'urn:big-iot:AccidentCategory',
  'urn:big-iot:PM10Category',
  'urn:big-iot:NO2Category',
  'urn:big-iot:AirPollutionIndicatorCategory',
  'urn:big-iot:PM25Category',
  'urn:proposed:proposed:wifiprobes',
  'urn:big-iot:PeopleDensityOnBusCategory',
  'urn:big-iot:LocationTrackingCategory',
  'urn:big-iot:PeopleDensityInAreaCategory',
]

function parseArgs(args, usage) {
 
  var options = {};
  var positional = [];
  var haveOption = null;
  for (var arg of args) {
    if (arg.indexOf('=') != -1) {
      throw new Error(`--option=ARG not supported. Usage: ${usage}`);
    }

    if (haveOption) {
      options[haveOption] = arg;
      haveOption = null;
    } else {
      if (arg.indexOf('--') == 0) {
        haveOption = arg.slice(2);
      } else if (arg.indexOf('-') != -1) {
        throw new Error(`Short style -option not supported. Usage: ${usage}`);
      } else {
        positional.push(arg);
      }
    }
  }
  return [positional, options];
}

function main() {

  const config = {
    id: process.env.BIGIOT_CONSUMER_ID,
    secret: process.env.BIGIOT_CONSUMER_SECRET,
  };
  if (!config.id) {
    throw new Error("Missing BIGIOT_CONSUMER_ID");
  }
  if (!config.secret) {
    throw new Error("Missing BIGIOT_CONSUMER_SECRET");
  }

  var [args, options] = parseArgs(process.argv.slice(2), "Usage: bigiotjs-check-offerings [--category URI] [--offering OFFERING]");

  var categories = knownCategories;
  if (options.category) {
    categories = [ options.category ]; 
  }

  // TODO: allow to specify --offering

  const consumer = new bigiot.consumer(config.id, config.secret);

  const checkCategory = (category) => {
    return subscribeAndFetch(consumer, category).then((data) => {
        return data;
    });
  };

  consumer.authenticate().then(() => {
    return Promise.all(categories.map((c) => checkCategory(c)));
  }).then((cc) => {
    const flat = flatten(cc);
    console.log(renderCSV(flat));

    if (options.html) {
      const report = renderHtml(flat, reportStyle);
      fs.writeFileSync(options.html, report);
    }
  }).catch((err) => {
    console.error('error', err);
    process.exit(1);
  });
}

module.exports = {
}

if (!module.parent) { main() }




