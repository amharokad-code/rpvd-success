'use strict';
// Client Stripe partagé (instancié paresseusement pour que le require ne plante pas sans env).

const Stripe = require('stripe');

let client = null;
function getStripe() {
  if (!client) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY manquante');
    client = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return client;
}

module.exports = { getStripe };
