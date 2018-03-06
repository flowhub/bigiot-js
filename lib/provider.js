const gql = require('graphql-tag');
const jwt = require('jsonwebtoken');
// Polyfill for fetch()
require('isomorphic-fetch');

const Client = require('./client');

const addOfferingMutation = gql`
    mutation addOffering($newOffering:AddOffering!){
      addOffering(input: $newOffering){
        id name
        provider { id name organization { id name } }
        activation { status expirationTime }
        rdfAnnotation { uri label proposed }
        inputs { name rdfAnnotation { uri label proposed } }
        outputs { name rdfAnnotation { uri label proposed } }
        spatialExtent { city boundary { l1 { lat lng } l2 { lat lng } } }
        license
        price { pricingModel money { amount currency } }
      }
    }
`;

const deleteOfferingMutation = gql`
    mutation deleteOffering($Offering:DeleteOffering!){
      deleteOffering(input: $Offering){
        id
      }
    }
`;

const activateOfferingMutation = gql`
    mutation activateOffering($Offering:ActivateOffering!){
      activateOffering(input: $Offering){
        id name
        provider { id name organization { id name } }
        activation { status expirationTime }
        rdfAnnotation { uri label proposed }
        inputs { name rdfAnnotation { uri label proposed } }
        outputs { name rdfAnnotation { uri label proposed } }
        spatialExtent { city boundary { l1 { lat lng } l2 { lat lng } } }
        license
        price { pricingModel money { amount currency } }
      }
    }
`;

class BigIotProvider extends Client {
  constructor(id, secret, market = 'https://market.big-iot.org') {
    super(market);
    this.id = id;
    this.secret = secret;
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

  delete(offering) {
    if (!this.client) {
      return Promise.reject(new Error('The provider must be authenticated before registering an offering'));
    }
    const offeringData = offering.toJSON();
    if (offeringData.id == null) {
      return Promise.reject(new Error('The offering must be registered before deleting it'));
    }
    return this.client.mutate({
      mutation: deleteOfferingMutation,
      variables: {
        Offering: {
          id: offeringData.id,
        },
      },
    }).then(result => result.data.deleteOffering);
  }

  activate(offering, expirationTime = null) {
    if (!this.client) {
      return Promise.reject(new Error('The provider must be authenticated before registering an offering'));
    }
    const offeringData = offering.toJSON();
    if (offeringData.id == null) {
      return Promise.reject(new Error('The offering must be registered before activating it'));
    }
    let expires = expirationTime;
    if (!expires) {
      // Default expiration in 10 minutes
      expires = new Date();
      expires.setMinutes(expires.getMinutes() + 10);
    }
    offeringData.expirationTime = expires;
    return this.client.mutate({
      mutation: activateOfferingMutation,
      variables: {
        Offering: offeringData,
      },
    }).then(result => result.data.activateOffering);
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
