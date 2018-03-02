const { expect } = require('chai');
const { provider: BigIotProvider, offering: BigIotOffering } = require('../index');
const gql = require('graphql-tag');
const jwt = require('jsonwebtoken');

describe('BIG IoT Provider', () => {
  const providerId = process.env.BIGIOT_PROVIDER_ID
  const providerSecret = process.env.BIGIOT_PROVIDER_SECRET
  it('should be possible to instantiate', () => {
    let prov = new BigIotProvider();
    expect(prov).to.be.an('object');
  });
  describe('registering an offering without secrets', () => {
    it('should fail on authenticate', (done) => {
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
    it('should fail if register is called before authentication', (done) => {
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
      prov.register(off)
      .then((result) => {
        done(new Error('Unauthorized register passed'));
      })
      .catch((e) => {
        expect(e).to.be.an('error');
        expect(e.message).to.include('must be authenticated');
        done();
      });
      return;
    });
  });
  describe('registering and deleting an offering with a secret', () => {
    let prov = null;
    let off = null;
    before(() => {
      prov = new BigIotProvider(providerId, providerSecret);
      off = new BigIotOffering('test offering', 'urn:big-iot:EnvironmentalIndicatorCategory');
      off.endpoints = {
        uri: 'http://localhost/foo',
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
    });
    it('should succeed to authenticate', () => {
      return prov.authenticate();
    });
    it('should be able to register an offering', () => {
      return prov.register(off)
    });
    it('should have made the offering discoverable', () => {
      expect(off.id).to.be.a('string', 'Offering ID needs to be available');
      const query = gql`
        query offering($offeringId:String!) {
          offering(id:$offeringId) {
            id name
            rdfAnnotation { uri label }
            spatialExtent { city }
          }
        }
      `;
      return prov.client.query({
        query: query,
        variables: {
          offeringId: off.id,
        },
      })
      .then((result) => {
        expect(result.data.offering).to.be.an('object');
        const foundOffering = result.data.offering;
        expect(foundOffering.id).to.equal(off.id);
        expect(foundOffering.name).to.equal(off.name);
        expect(foundOffering.rdfAnnotation.uri).to.equal(off.rdfUri);
        expect(foundOffering.spatialExtent.city).to.equal(off.extent.city);
      });
    });
    it('should be able to delete an offering', () => {
      expect(off.id).to.be.a('string', 'Offering ID needs to be available');
      return prov.delete(off)
        .then((result) => {
          expect(result.id).to.equal(off.id);
        });
    });
    it('should no longer be able to find offering on the marketplace', () => {
      const query = gql`
        query offering($offeringId:String!) {
          offering(id:$offeringId) {
            id name
            rdfAnnotation { uri label }
            spatialExtent { city }
          }
        }
      `;
      return prov.client.query({
        query,
        variables: {
          offeringId: off.id,
        },
      })
        .then((result) => {
          expect(result.data.offering).to.be.null;
        })
    });
  });
  describe('validating consumer tokens', () => {
    let prov = null;
    before(() => {
      prov = new BigIotProvider(providerId, providerSecret);
    });
    it('should fail with a provider that doesn\'t have a secret', () => {
      const provAnon = new BigIotProvider(providerId);
      const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJGbHlpbmdfUGlnX1VHLVRlc3RfY29uc3VtZXItV2VhdGhlclF1ZXJ5PT1GbHlpbmdfUGlnX1VHLVNwcmVlX1dlYXRoZXItYWlycG9ydHdlYXRoZXIiLCJleHAiOjE1MDkwMjgzNTcsImlhdCI6MTUwOTAyNDc1Nywic3Vic2NyaWJhYmxlSWQiOiJGbHlpbmdfUGlnX1VHLVNwcmVlX1dlYXRoZXItYWlycG9ydHdlYXRoZXIiLCJzdWJzY3JpYmVySWQiOiJGbHlpbmdfUGlnX1VHLVRlc3RfY29uc3VtZXItV2VhdGhlclF1ZXJ5In0.JDyKNvxwb9mtANIGkJbtm1qkvneILpWn1reMKysJHPo';
      return provAnon.validateToken(token)
        .then(() => {
          throw new Error('Unexpected pass');
        })
        .catch((e) => {
          expect(e.message).to.contain('secret is required');
        });
    });
    it('should give an expiry error on an old token', () => {
      const token = jwt.sign({
        foo: 'bar',
      }, Buffer.from(prov.secret, 'base64'), {
        expiresIn: '-1h',
      });
      return prov.validateToken(token)
        .then(() => {
          throw new Error('Unexpected pass');
        })
        .catch((e) => {
          expect(e.message).to.contain('expired');
        });
    });
    it('should fail on unsigned token', () => {
      const token = jwt.sign({
        foo: 'bar'
      }, prov.secret, {
        algorithm: 'none',
        expiresIn: '1h',
      });
      return prov.validateToken(token)
        .then(() => {
          throw new Error('Unexpected pass');
        })
        .catch((e) => {
          expect(e.message).to.contain('signature is required');
        });
    });
    it('should fail on wrong encryption algorithm', () => {
      const token = jwt.sign({
        foo: 'bar'
      }, prov.secret, {
        algorithm: 'HS384',
        expiresIn: '1h',
      });
      return prov.validateToken(token)
        .then(() => {
          throw new Error('Unexpected pass');
        })
        .catch((e) => {
          expect(e.message).to.contain('invalid algorithm');
        });
    });
    it('should fail on wrong signature', () => {
      const token = jwt.sign({
        foo: 'bar',
      }, 'Hello world', {
        expiresIn: '1h',
      });
      return prov.validateToken(token)
        .then(() => {
          throw new Error('Unexpected pass');
        })
        .catch((e) => {
          expect(e.message).to.contain('invalid signature');
        });
    });
    it('should pass on correct signature and expiry', () => {
      const token = jwt.sign({
        foo: 'bar',
      }, Buffer.from(prov.secret, 'base64'), {
        expiresIn: '1h',
      });
      return prov.validateToken(token)
        .then((result) => {
          delete result.iat;
          delete result.exp;
          expect(result).to.eql({
            foo: 'bar'
          });
        })
    });
  });
});
