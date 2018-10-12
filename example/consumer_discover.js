// Replace with require('bigiot-js')
const { consumer: BigIotConsumer, offering: BigIotOffering } = require('../index');
const https = require('https');

// Java providers use self-signed SSL certificates
const ignoreSSLAgent = https.Agent({ rejectUnauthorized: false });

// Configure your consumer by setting the BIGIOT_CONSUMER_ID and BIGIOT_CONSUMER_SECRET environment
// variables
const config = {
  id: process.env.BIGIOT_CONSUMER_ID,
  secret: process.env.BIGIOT_CONSUMER_SECRET,
};

// Create a new consumer instance with your credentials
const consumer = new BigIotConsumer(config.id, config.secret, null, { httpAgent: ignoreSSLAgent });

const area = {
  latitude: 50.9375,
  longitude: 6.9603,
  radius: 1000,
};

const query = new BigIotOffering('Parking spaces', 'urn:big-iot:ParkingSpaceCategory');
// Remove requirements we don't care about
delete query.license;
delete query.extent;
delete query.price;

function accessOffering(offering) {
  return consumer.subscribe(offering.id).then(subscription => consumer.access(subscription, area));
}

consumer.authenticate()
  .then(() => consumer.discover(query))
  .then(allOfferings => Promise.all(allOfferings.map(accessOffering)))
  .then((data) => {
    console.log(data);
  })
  .catch((err) => {
    if (!err.networkError) {
      console.log(err);
    }
    console.log(err.networkError.result);
  });
