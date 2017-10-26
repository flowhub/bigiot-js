const apollo = require('apollo-client');
const gql = require('graphql-tag');
const url = require('url');
const jwt = require('jsonwebtoken');
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
    const parsed = url.parse(this.market);
    parsed.pathname = '/graphql';
    const networkInterface = apollo.createNetworkInterface({
      uri: url.format(parsed),
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
    if (!this.client) {
      return Promise.reject(new Error('The provider must be authenticated before registering an offering'));
    }
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
    }).then((result) => {
      offering.setId(result.data.addOffering.id);
      return result.data.addOffering.id;
    });
  }

  validateToken(token) {
    if (!this.secret) {
      return Promise.reject(new Error('Provider secret is required for validating subscriber tokens'));
    }
    const secret = Buffer.from(this.secret, 'base64');
    return new Promise((resolve, reject) => {
      jwt.verify(token, secret, {
        algorithms: ['HS256'],
      }, (err, decoded) => {
        if (err) {
          reject(err);
          return;
        }
        if (!decoded.exp) {
          reject(new Error('Token has no expiry value'));
          return;
        }
        if (decoded.exp * 1000 < Date.now()) {
          reject(new Error('Token has expired'));
          return;
        }
        resolve(decoded);
      });
    });
  }
}

module.exports = BigIotProvider;
