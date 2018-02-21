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
        inputs { name rdfAnnotation { uri } }
        outputs { name rdfAnnotation { uri } }
        endpoints { uri endpointType accessInterfaceType }
      }
    }
  }
`;

class BigIotConsumer extends Client {
  constructor(id, secret, market = 'https://market.big-iot.org') {
    super(market);
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
    })
      .then(result => result.data.subscribeConsumerToOffering);
  }

  access(subscription, inputs) {
    const parsed = url.parse(subscription.offering.endpoints[0].uri);
    parsed.query = inputs;
    return fetch(url.format(parsed), {
      headers: {
        Authorization: `Bearer ${subscription.accessToken}`,
      },
    })
      .then((response) => {
        if (response.status !== 200) {
          throw new Error(`Provider failed with ${response.status}: ${response.statusText}`);
        }
        return response.json();
      });
  }
}

module.exports = BigIotConsumer;
