// Replace with require('bigiot-js')
const { provider: BigIotProvider, offering: BigIotOffering } = require('../index');

// Configure your provider by setting the BIGIOT_PROVIDER_ID and BIGIOT_PROVIDER_SECRET environment
// variables
const config = {
  id: process.env.BIGIOT_PROVIDER_ID,
  secret: process.env.BIGIOT_PROVIDER_SECRET,
};

const provider = new BigIotProvider(config.id, config.secret);

function createOffering() {
  // Instantiate an offering of the desired type
  const offering = new BigIotOffering('TestOffering', 'urn:proposed:Miscellaneous');

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
  ];

  // Define the data structure your offering returns when called
  offering.outputData = [
    {
      name: 'temperature',
      rdfUri: 'http://schema.org/airTemperatureValue',
    },
  ];
  return offering;
}

provider.authenticate()
  .then(createOffering)
  .then((offering) => {
    provider.register(offering)
      .then(() => {
        console.log(`Offering ${offering.id} registered`);
        // Re-register offering periodically to keep it active
        setInterval(() => provider.register(offering), 30000);
      });
  });
