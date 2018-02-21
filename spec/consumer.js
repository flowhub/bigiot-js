const { expect } = require('chai');
const { consumer: BigIotConsumer, offering: BigIotOffering } = require('../index');

describe('BIG IoT Consumer', () => {
  const consumerId = process.env.BIGIOT_CONSUMER_ID
  const consumerSecret = process.env.BIGIOT_CONSUMER_SECRET
  it('should be possible to instantiate', () => {
    let consumer = new BigIotConsumer();
    expect(consumer).to.be.an('object');
  });
  describe('subscribing to an offering by ID', () => {
    let consumer = null;
    let subscription = null;
    before(() => {
      consumer = new BigIotConsumer(consumerId, consumerSecret);
    });
    it('should succeed to authenticate', () => {
      return consumer.authenticate();
    });
    it('should be able to subscribe to an offering', () => {
      return consumer.subscribe('Flowhub_UG-ParkingProductionNew-Cologne_Parking')
        .then((sub) => {
          subscription = sub;
          return sub;
        });
    });
    it('should be able to access the subscribed offering', () => {
      return consumer.access(subscription, {
        latitude: 50.9375,
        longitude: 6.9603,
        radius: 1000,
      })
        .then((result) => {
          expect(result).to.be.an('array');
          expect(result.length).to.be.above(0);
          expect(result[0].latitude).to.be.a('number');
          expect(result[0].longitude).to.be.a('number');
          expect(result[0].vacant).to.be.a('number');
          return true;
        });
    });
  });
  describe('discovering offerings', () => {
    let consumer = null;
    let offerings = null;
    before(() => {
      consumer = new BigIotConsumer(consumerId, consumerSecret);
    });
    it('should succeed to authenticate', () => {
      return consumer.authenticate();
    });
    it('should be able to discover offerings', () => {
      const query = new BigIotOffering('Parking sites', 'urn:big-iot:ParkingSiteCategory');
      delete query.license;
      delete query.extent;
      delete query.price;
      return consumer.discover(query)
        .then((allOfferings) => {
          expect(allOfferings).to.be.an('array');
          expect(allOfferings.length).to.be.above(0);
          offerings = allOfferings;
        });
    });
  });
});
