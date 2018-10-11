
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
    const attrs = attrValues.length ? ' ' + attrs.join(' ') : '';
    const childs = children.map((c) => c.toString()).join('\n');
    return `<${type} ${attrs}>${childs}</${type}>`
}

function renderHtml(results) {
  
  var rows = []; 

  const tr = (a, c) => htmlElement('tr', a, c)
  const td = (a, c) => htmlElement('td', a, c)
  const table = (a, c) => htmlElement('table', a, c)
  const thead = (a, c) => htmlElement('thead', a, c)
  const tds = (a, vals) => vals.map((v) => td(a, v))
  const e = htmlElement;

  const header = thead({},
                  tr({}, tds({}, ['Provider', 'Offering', 'Data', 'SSL', 'CORS']))
  );

  const errorElement = (errStr) => {
    return (errStr) ? `<span title=${errStr}>❌</span>` : `<span>✓</span>` 
  };

  // TODO: show organization, offering name in separate rows
  // TODO: show SSL, CORS, error, fields separately
  for (var offering of results) {
    const offeringPieces = offering.offeringId.split('-');
    const offeringName = offeringPieces[offeringPieces.length-1];

    //console.log('fo', offering);

    const items = [
      offering.providerId,
      offeringName,
      errorElement(offering.fetchError),
      errorElement(offering.sslError),
      errorElement(offering.corsError)
    ];
    const row = tr({}, tds({}, items));
    rows.push(row);

    //console.log(offering.offeringId, '\t\t\t', offering.errorMessage);
  }

  const contents = table({}, [ header, e('tbody', {}, rows) ]);

  const head = e('head', {}, [ '<meta content="text/html;charset=utf-8" http-equiv="Content-Type">' ]);
  return e('html', {}, [ head , e('body', {}, contents) ]); 
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
          const allowOrigin = response.headers['Access-Control-Allow-Origin'];
          const allowMethods = response.headers['Access-Control-Allow-Methods'];
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
        accessResult.sslError = null;
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

  const name = category;
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
    return processResults(results);
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

  // TODO: allow to specify --category
  // TOOD: allow to specify --offering

  const consumer = new bigiot.consumer(config.id, config.secret);

  const checkCategory = (category) => {
    return subscribeAndFetch(consumer, category).then((data) => {
        return data;
    });
  };

  var categories = knownCategories.slice(0,2);

  consumer.authenticate().then(() => {
    return Promise.all(categories.map((c) => checkCategory(c)));
  }).then((cc) => {
    const flat = flatten(cc);
    console.log(JSON.stringify(flat, null, 2));

    const report = renderHtml(flat);
    fs.writeFileSync('report.html', report);
  }).catch((err) => {
    console.error('error', err);
    process.exit(1);
  });
}

module.exports = {
}

if (!module.parent) { main() }




