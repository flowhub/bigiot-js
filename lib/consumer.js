const gql = require('graphql-tag');
const url = require('url');
// Polyfill for fetch()
require('isomorphic-fetch');

const Client = require('./client');

const subscribeConsumerToOffering = gql`
    mutation subscribeConsumerToOffering($subscription:SubscribeConsumerToOffering!) {
      subscribeConsumerToOffering(input: $subscription) {
        id accessToken
        offering {
          id
          provider { id name organization { id name } }
          activation { status expirationTime }
          rdfAnnotation { uri label proposed }
          inputs { name rdfAnnotation { uri } }
          outputs { name rdfAnnotation { uri } }
          endpoints { uri endpointType accessInterfaceType }
          spatialExtent { city boundary { l1 { lat lng } l2 { lat lng } } }
          license
          price { pricingModel money { amount currency } }
        }
      }
    }
`;

const addOfferingQuery = gql`
    mutation addOfferingQuery($newOfferingQuery:AddOfferingQuery!){
      addOfferingQuery(input: $newOfferingQuery){
        id name
      }
    }
`;

const matchOfferings = gql`
    query matchingOfferings($queryId:String!) {
      matchingOfferings(queryId:$queryId) {
        id
        provider { id name organization { id name } }
        activation { status expirationTime }
        rdfAnnotation { uri label proposed }
        inputs { name rdfAnnotation { uri } }
        outputs { name rdfAnnotation { uri } }
        endpoints { uri endpointType accessInterfaceType }
        spatialExtent { city boundary { l1 { lat lng } l2 { lat lng } } }
        license
        price { pricingModel money { amount currency } }
      }
    }
`;

const getOffering = gql`
    query offering($offeringId: String!) {
      offering(id: $offeringId) {
        id
        name
        accessWhiteList
        provider { id name organization { id name } }
        rdfAnnotation { uri label proposed }
        rdfContext { context prefixes { prefix uri } }
        endpoints { endpointType uri accessInterfaceType }
        outputs { name rdfAnnotation { uri label proposed } }
        inputs { name rdfAnnotation { uri label proposed } }
        spatialExtent { city boundary { l1 { lat lng } l2 { lat lng } } }
        temporalExtent { from to }
        license
        price { pricingModel money { amount currency } }
        activation { status expirationTime }
      }
    }`;

class BigIotConsumer extends Client {
  constructor(id, secret, market = 'https://market.big-iot.org', cors = undefined) {
    super(market, cors);
    this.id = id;
    this.secret = secret;
  }

  subscribe(offeringId) {
    if (!this.client) {
      return Promise.reject(new Error('The consumer must be authenticated before subscribing to an offering'));
    }
    return this.client.mutate({
      mutation: subscribeConsumerToOffering,
      variables: {
        subscription: {
          id: this.id,
          offeringId,
        },
      },
    }).then(result => result.data.subscribeConsumerToOffering);
  }

  access(subscription, inputs) {
    const parsed = url.parse(subscription.offering.endpoints[0].uri);
    parsed.query = inputs;
    return fetch(this.normalizeUrl(url.format(parsed)), {
      headers: {
        Authorization: `Bearer ${subscription.accessToken}`,
      },
    }).then((response) => {
      if (response.status !== 200) {
        throw new Error(`Provider failed with ${response.status}: ${response.statusText}`);
      }
      return response.json();
    });
  }

  discover(offering) {
    const query = offering.toJSON();
    delete query.endpoints;
    delete query.id;
    query.id = this.id;
    return this.client.mutate({
      mutation: addOfferingQuery,
      variables: {
        newOfferingQuery: query,
      },
    }).then(result => this.client.query({
      query: matchOfferings,
      variables: {
        queryId: result.data.addOfferingQuery.id,
      },
    })).then(result => result.data.matchingOfferings);
  }

  get(id) {
    return this.client.query({
      query: getOffering,
      variables: {
        offeringId: id,
      },
    }).then(result => result.data.offering);
  }
}

module.exports = BigIotConsumer;
