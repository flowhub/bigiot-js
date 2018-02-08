class BigIotOffering {
  constructor(name, rdfUri, inputData = [], outputData = [], endpoints = {}, extent = {}) {
    this.name = name;
    this.rdfUri = rdfUri;
    this.inputData = inputData;
    this.outputData = outputData;
    this.endpoints = endpoints;
    this.extent = extent;
    // Defaults for unused pricing data
    this.license = 'OPEN_DATA_LICENSE';
    this.price = {
      money: {
        amount: 0.001,
        currency: 'EUR',
      },
      pricingModel: 'PER_ACCESS',
    };
  }

  setId(id) {
    this.id = id;
  }

  toJSON() {
    const { endpoints } = this;
    if (!endpoints.endpointType) {
      endpoints.endpointType = 'HTTP_GET';
    }
    if (!endpoints.accessInterfaceType) {
      endpoints.accessInterfaceType = 'BIGIOT_LIB';
    }
    return {
      id: this.id,
      name: this.name,
      rdfUri: this.rdfUri,
      inputs: this.inputData,
      outputs: this.outputData,
      endpoints,
      spatialExtent: this.extent,
      license: this.license,
      price: this.price,
    };
  }
}

module.exports = BigIotOffering;
