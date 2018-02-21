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

// Authenticate your consumer
consumer.authenticate().then(() => {
  // authentication is done
  console.log('Consumer authentication successful!');
  consumer.subscribe('Bosch_CR-AirQualityDataService-WeatherData_Offering')
    .then((offering) => {
      console.log('Offering subscription successful!');

      const accessParameters = {
        longitude: 9.2,
        latitude: 42.0,
        radius: 10000000,
      };

      consumer.access(offering, accessParameters).then((response) => {
        console.log('Respose: ', response);
      });
    });
});
