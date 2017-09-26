const { expect } = require('chai');
const BigIotOffering = require('../lib/offering');

describe('BIG IoT Offering', () => {
  it('should be possible to instantiate', () => {
    let off = new BigIotOffering();
    expect(off).to.be.an('object');
  });
});
