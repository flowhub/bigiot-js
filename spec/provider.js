const { expect } = require('chai');
const { provider: BigIotProvider, offering: BigIotOffering } = require('../index');

describe('BIG IoT Provider', () => {
  it('should be possible to instantiate', () => {
    let prov = new BigIotProvider();
    expect(prov).to.be.an('object');
  });
  describe('registering an offering without secrets', () => {
    it('should fail', (done) => {
      let prov = new BigIotProvider('foo');
      let off = new BigIotOffering('test', 'test offering', 'http://example.org/test');
      off.endpoints = {
        uri: 'http://example.net/foo',
        endpointType: 'HTTP_GET',
        accessInterfaceType: 'BIGIOT_LIB',
      };
      off.extent = {
        city: 'Berlin'
      };
      prov.register(off)
      .then(() => {
        done(new Error('Unauthorized register passed'));
      })
      .catch((e) => {
        expect(e).to.be.an('error');
        expect(e.message).to.include('NotAuthorized');
        done();
      });
      return;
    });
  });
});

