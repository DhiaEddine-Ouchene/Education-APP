const Stripe = require('stripe');
const { db } = require('../db/connection');
const { saveDb } = require('../db/connection');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

let stripe;
if (STRIPE_SECRET_KEY && !STRIPE_SECRET_KEY.includes('your_stripe')) {
  stripe = new Stripe(STRIPE_SECRET_KEY);
  console.log('Stripe initialized with API Key.');
} else {
  console.log('Running in Mock Billing Mode (no Stripe key configured).');
}

const PLANS = {
  Free:   { name: 'Free',   maxSets: 3,      maxStudents: 5,      price: 0,  priceId: null },
  Pro:    { name: 'Pro',    maxSets: 50,     maxStudents: 100,    price: 19, priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_mock_pro_19' },
  School: { name: 'School', maxSets: 999999, maxStudents: 999999, price: 79, priceId: process.env.STRIPE_SCHOOL_PRICE_ID || 'price_mock_school_79' }
};

function isStripeActive() { return !!stripe; }
function getPlanConfig(planName) { return PLANS[planName] || PLANS.Free; }

async function createCheckoutSession({ organizationId, orgName, planName, successUrl, cancelUrl }) {
  const plan = getPlanConfig(planName);

  if (stripe && plan.priceId && !plan.priceId.startsWith('price_mock_')) {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: plan.priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: organizationId,
      metadata: { organizationId, planName }
    });
    return { url: session.url, isMock: false };
  }

  const mockUrl = `/api/billing/mock-checkout-portal?orgId=${organizationId}&plan=${planName}&successUrl=${encodeURIComponent(successUrl)}&cancelUrl=${encodeURIComponent(cancelUrl)}`;
  return { url: mockUrl, isMock: true };
}

function updateOrganizationPlan(orgId, planName, stripeSubscriptionId = null, stripeCustomerId = null) {
  const allOrgs = db.tables['organizations'] ? db.tables['organizations'].data : [];
  const org = allOrgs.find(o => o.id === orgId);
  if (org) {
    org.plan = planName;
    if (stripeSubscriptionId) org.stripe_subscription_id = stripeSubscriptionId;
    if (stripeCustomerId) org.stripe_customer_id = stripeCustomerId;
    saveDb();
  }
}

async function handleStripeWebhook(payload, signature) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) throw new Error('Stripe webhooks are not configured');
  const event = stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    updateOrganizationPlan(session.client_reference_id, session.metadata.planName, session.subscription, session.customer);
  } else if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    const allOrgs = db.tables['organizations'] ? db.tables['organizations'].data : [];
    const org = allOrgs.find(o => o.stripe_subscription_id === sub.id);
    if (org) { org.plan = 'Free'; org.stripe_subscription_id = null; saveDb(); }
  }
}

module.exports = { isStripeActive, getPlanConfig, createCheckoutSession, updateOrganizationPlan, handleStripeWebhook, PLANS };
