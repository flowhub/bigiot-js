// Replace with require('bigiot-js')
const { consumer: BigIotConsumer } = require('../index');

// Java providers use self-signed SSL certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Configure your consumer by setting the BIGIOT_CONSUMER_ID and BIGIOT_CONSUMER_SECRET environment
// variables
const config = {
  id: process.env.BIGIOT_CONSUMER_ID,
  secret: process.env.BIGIOT_CONSUMER_SECRET,
};

// Create a new consumer instance with your credentials
const consumer = new BigIotConsumer(config.id, config.secret);

const area = {
  latitude: 50.9375,
  longitude: 6.9603,
  radius: 1000,
};

consumer.authenticate()
  .then(() => consumer.discover('urn:big-iot:ParkingSpaceCategory'))
  .then((allOfferings) => {
    return Promise.all(allOfferings.map((offering) => {
      return consumer.subscribe(offering.id)
        .then((subscription) => consumer.access(subscription, area));
    }));
  })
  .then((data) => {
    console.log(data);
  });;
