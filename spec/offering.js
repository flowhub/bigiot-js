const { expect } = require('chai');
const { offering: BigIotOffering } = require('../index');

describe('BIG IoT Offering', () => {
  it('should be possible to instantiate', () => {
    let off = new BigIotOffering();
    expect(off).to.be.an('object');
  });
});
