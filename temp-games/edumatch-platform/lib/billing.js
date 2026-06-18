// Subscription / billing.
// Real payments need Stripe. If STRIPE_SECRET_KEY is set, you can wire Checkout.
// Without it, this runs in "mock" mode so you can demo the full subscription flow.
import { db, logEvent } from './db.js'
import { now } from './util.js'

export const PLANS = {
  free:  { id: 'free',  name: 'Free',         price: 0,  maxSets: 3,  maxStudents: 10,  ai: false, aiTrials: 3 },
  pro:   { id: 'pro',   name: 'Teacher Pro',  price: 9,  maxSets: 1000, maxStudents: 300, ai: true },
  school:{ id: 'school',name: 'School',       price: 29, maxSets: 100000, maxStudents: 100000, ai: true },
}

export function planFor(org) {
  return PLANS[org?.plan] || PLANS.free
}

export function aiUsage(orgId) {
  if (!orgId) return 0
  return db.prepare("SELECT COUNT(*) c FROM events WHERE org_id=? AND type IN ('ai_generate','ai_extract')").get(orgId).c
}

export function setPlan(orgId, plan, status = 'active') {
  if (!PLANS[plan]) throw new Error('Unknown plan')
  db.prepare('UPDATE orgs SET plan=?, plan_status=? WHERE id=?').run(plan, status, orgId)
  logEvent('subscription_changed', { orgId, meta: { plan, status } })
  return PLANS[plan]
}

// Returns either a real Stripe Checkout URL (if configured) or a mock confirmation.
export async function startCheckout(org, plan) {
  const key = process.env.STRIPE_SECRET_KEY
  if (!PLANS[plan]) throw new Error('Unknown plan')
  if (!key) {
    // Mock mode: immediately activate (so you can test the flow end-to-end)
    setPlan(org.id, plan, 'active')
    return { mode: 'mock', activated: true, plan }
  }
  // Stripe scaffold (uncomment / extend once you add your price IDs):
  // const body = new URLSearchParams({ 'mode':'subscription', 'success_url':..., 'cancel_url':..., 'line_items[0][price]': PRICE_ID, 'line_items[0][quantity]':'1' })
  // const r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method:'POST', headers:{ Authorization:`Bearer ${key}`,'Content-Type':'application/x-www-form-urlencoded'}, body })
  // const session = await r.json(); return { mode:'stripe', url: session.url }
  return { mode: 'stripe-not-configured', message: 'Add Stripe price IDs in lib/billing.js to enable live checkout.' }
}
