const { ApolloLink } = require('apollo-link');
const { createHttpLink } = require('apollo-link-http');
const { InMemoryCache } = require('apollo-cache-inmemory');
const apollo = require('apollo-client');
const gql = require('graphql-tag');
const url = require('url');
// Polyfill for fetch()
require('isomorphic-fetch');

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

class BigIotConsumer {
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
    const httpLink = createHttpLink({
      uri: url.format(parsed),
    });
    const middlewareLink = new ApolloLink((operation, forward) => {
      operation.setContext({
        headers: {
          authorization: token ? `Bearer ${token}` : null,
        },
      });
      return forward(operation);
    });
    const link = middlewareLink.concat(httpLink);
    const cache = new InMemoryCache();
    return new apollo.ApolloClient({
      link,
      cache,
    });
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
