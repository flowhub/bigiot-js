const apollo = require('apollo-client');
const gql = require('graphql-tag');
const url = require('url');
// Polyfill for fetch()
require('isomorphic-fetch');

const addOfferingMutation = gql`
    mutation addOffering($newOffering:AddOffering!){
      addOffering(input: $newOffering){
        id name
        provider { id name organization { id name } }
        activation { status expirationTime }
        rdfType { uri name }
        inputData { name rdfType { uri name } } 
        outputData { name rdfType { uri name } } 
        extent { city }
        license
        price { pricingModel money { amount currency } }
      }
    }
`;

class BigIotProvider {
  constructor(id, secret, market = 'https://market.big-iot.org') {
    this.id = id;
    this.secret = secret;
    this.market = market;
  }

  authenticate() {
    const parsed = url.parse(this.market);
    parsed.pathname = '/accessToken';
    parsed.query = {
      clientId: this.id,
      clientSecret: this.secret,
    };
    return fetch(url.format(parsed))
      .then((response) => {
        if (response.status !== 200) {
          throw new Error(`Failed with ${response.statusText}`);
        }
        return response.text();
      })
      .then((token) => {
        this.client = this.getClient(token);
        return true;
      });
  }

  getClient(token) {
    const networkInterface = apollo.createNetworkInterface({
      uri: `${this.market}/graphql`,
    });
    networkInterface.use([{
      applyMiddleware(req, next) {
        if (!req.options.headers) {
          req.options.headers = {};
        }
        req.options.headers.authorization = token ? `Bearer ${token}` : null;
        next();
      },
    }]);
    return new apollo.ApolloClient({
      networkInterface,
    });
  }

  register(offering, expirationTime = null) {
    let expires = expirationTime;
    if (!expires) {
      // Default expiration in 10 minutes
      expires = new Date();
      expires.setMinutes(expires.getMinutes() + 10);
    }
    const offeringData = offering.toJSON();
    offeringData.id = this.id;
    offeringData.activation = {
      status: true,
      expirationTime: expires.getTime(),
    };
    return this.client.mutate({
      mutation: addOfferingMutation,
      variables: {
        newOffering: offeringData,
      },
    });
  }
}

module.exports = BigIotProvider;
