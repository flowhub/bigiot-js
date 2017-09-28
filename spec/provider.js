const { expect } = require('chai');
const { provider: BigIotProvider, offering: BigIotOffering } = require('../index');

describe('BIG IoT Provider', () => {
  const providerId = process.env.BIGIOT_PROVIDER_ID
  const providerSecret = process.env.BIGIOT_PROVIDER_SECRET
  it('should be possible to instantiate', () => {
    let prov = new BigIotProvider();
    expect(prov).to.be.an('object');
  });
  describe('registering an offering without secrets', () => {
    it('should fail', (done) => {
      let prov = new BigIotProvider(providerId);
      let off = new BigIotOffering('test offering', 'http://example.org/test');
      off.endpoints = {
        uri: 'http://example.net/foo',
        endpointType: 'HTTP_GET',
        accessInterfaceType: 'BIGIOT_LIB',
      };
      off.extent = {
        city: 'Berlin'
      };
      prov.authenticate()
        .then(() => {
          return prov.register(off)
        })
        .then((result) => {
          done(new Error('Unauthorized register passed'));
        })
        .catch((e) => {
          expect(e).to.be.an('error');
          expect(e.message).to.include('Unauthorized');
          done();
        });
      return;
    });
  });
  describe('registering an offering with a secret', () => {
    it('should succeed', () => {
      let prov = new BigIotProvider(providerId, providerSecret);
      let off = new BigIotOffering('test offering', 'bigiot:weather');
      off.endpoints = {
        uri: 'http://localhost/foo',
        endpointType: 'HTTP_GET',
        accessInterfaceType: 'BIGIOT_LIB',
      };
      off.outputData = [
        {
          name: "temperature",
          rdfUri: 'http://schema.org/airTemperatureValue',
        }
      ];
      off.extent = {
        city: 'Berlin'
      };
      return prov.authenticate()
        .then(() => {
          return prov.register(off)
        });
    });
    it('should have made the offering discoverable');
  });
});

