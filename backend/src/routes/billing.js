const express = require('express');
const router = express.Router();
const { db } = require('../db/connection');
const { authenticate, requireAuth, requireTenant, requireRole } = require('../middleware/auth');
const { createCheckoutSession, updateOrganizationPlan, handleStripeWebhook, PLANS } = require('../services/billingService');


/**
 * POST Create a billing checkout session
 */
router.post('/checkout', authenticate, requireAuth, requireTenant, requireRole(['teacher']), async (req, res, next) => {
  const { planName, successUrl, cancelUrl } = req.body;
  const orgId = req.user.organization_id;

  if (!planName || !['Pro', 'School'].includes(planName)) {
    return res.status(400).json({ error: 'Invalid plan selected' });
  }

  try {
    const allOrgs = db.tables['organizations'] ? db.tables['organizations'].data : [];
    const org = allOrgs.find(o => o.id === orgId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const session = await createCheckoutSession({
      organizationId: orgId,
      orgName: org.name,
      planName,
      successUrl,
      cancelUrl
    });

    res.json(session);

  } catch (err) {
    next(err);
  }
});

/**
 * POST Real Stripe Webhook callback
 * Note: Needs express.raw() parser on the server index file!
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  try {
    await handleStripeWebhook(req.body, sig);
    res.sendStatus(200);
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

/**
 * POST Process Mock Checkout Upgrade
 */
router.post('/mock-checkout', async (req, res, next) => {
  const { orgId, planName } = req.body;
  if (!orgId || !planName || !['Pro', 'School'].includes(planName)) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  try {
    const mockSubId = `sub_mock_${Math.random().toString(36).substr(2, 9)}`;
    const mockCustId = `cus_mock_${Math.random().toString(36).substr(2, 9)}`;
    
    await updateOrganizationPlan(orgId, planName, mockSubId, mockCustId);
    res.json({ success: true, message: 'Plan upgraded successfully in Mock Mode' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET Serve mock Stripe checkout portal (interactive sandbox)
 */
router.get('/mock-checkout-portal', async (req, res) => {
  const { orgId, plan, successUrl, cancelUrl } = req.query;
  const planInfo = PLANS[plan] || PLANS.Pro;

  let orgName = 'Your Organization';
  try {
    const allOrgs = db.tables['organizations'] ? db.tables['organizations'].data : [];
    const org = allOrgs.find(o => o.id === orgId);
    if (org) orgName = org.name;
  } catch (e) {
    console.error(e);
  }

  // Render a beautiful Stripe-like simulation screen
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>EduMatch Billing Portal - Stripe Simulator</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background-color: #F8FAFC; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
        .checkout-container { background: #FFFFFF; max-width: 850px; width: 100%; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); display: flex; overflow: hidden; }
        .left-panel { background: #1E293B; color: #FFFFFF; flex: 1.2; padding: 40px; display: flex; flex-direction: column; justify-content: space-between; }
        .right-panel { flex: 1.5; padding: 40px; }
        .badge { background: rgba(255,255,255,0.1); color: #94A3B8; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; text-transform: uppercase; align-self: flex-start; margin-bottom: 20px; }
        .org-title { color: #94A3B8; font-size: 14px; font-weight: 500; margin-bottom: 8px; }
        .plan-name { font-size: 28px; font-weight: 700; margin-bottom: 15px; }
        .price-desc { font-size: 36px; font-weight: 800; display: flex; align-items: baseline; }
        .price-desc span { font-size: 16px; font-weight: 400; color: #94A3B8; margin-left: 6px; }
        .billing-info { border-top: 1px solid #334155; margin-top: 40px; padding-top: 20px; }
        .billing-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; color: #CBD5E1; }
        .total-row { border-top: 1px solid #334155; padding-top: 12px; font-size: 16px; font-weight: 600; color: #FFFFFF; }
        .stripe-sim-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .stripe-sim-header img { height: 28px; }
        .sim-indicator { background: #FEF3C7; color: #92400E; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 9999px; text-transform: uppercase; border: 1px solid #FCD34D; }
        .input-group { margin-bottom: 20px; }
        .input-group label { display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 6px; }
        .input-field { width: 100%; padding: 10px 12px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 14px; outline: none; }
        .input-field:focus { border-color: #6366F1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15); }
        .card-inputs { display: grid; grid-template-columns: 2fr 1fr; gap: 10px; }
        .card-row { grid-column: span 2; position: relative; }
        .pay-button { background: #6366F1; color: #FFFFFF; border: none; font-weight: 600; width: 100%; padding: 12px; border-radius: 6px; font-size: 15px; cursor: pointer; transition: background 0.15s ease; box-shadow: 0 4px 6px -1px rgba(99,102,241,0.2); }
        .pay-button:hover { background: #4F46E5; }
        .cancel-link { display: block; text-align: center; text-decoration: none; color: #64748B; font-size: 14px; margin-top: 15px; font-weight: 500; }
        .cancel-link:hover { color: #334155; }
        .spinner { display: none; width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: #FFFFFF; animation: spin 1s ease-in-out infinite; margin: 0 auto; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media(max-width: 650px) {
          .checkout-container { flex-direction: column; }
          .left-panel { padding: 30px; }
          .right-panel { padding: 30px; }
        }
      </style>
    </head>
    <body>
      <div class="checkout-container">
        <div class="left-panel">
          <div>
            <div class="badge">Sandbox Mode</div>
            <div class="org-title">${orgName}</div>
            <div class="plan-name">EduMatch ${plan} Plan</div>
            <div class="price-desc">$${planInfo.price}.00 <span>/ month</span></div>
          </div>
          <div class="billing-info">
            <div class="billing-row">
              <span>EduMatch ${plan} Subscription</span>
              <span>$${planInfo.price}.00</span>
            </div>
            <div class="billing-row">
              <span>Sales Tax (0%)</span>
              <span>$0.00</span>
            </div>
            <div class="billing-row total-row">
              <span>Total due today</span>
              <span>$${planInfo.price}.00</span>
            </div>
          </div>
        </div>
        <div class="right-panel">
          <div class="stripe-sim-header">
            <h2 style="font-size: 18px; font-weight: 700; color: #1E293B;">Stripe Test Payment</h2>
            <div class="sim-indicator">Simulator</div>
          </div>
          <form id="payment-form">
            <div class="input-group">
              <label>Email Address</label>
              <input class="input-field" type="email" value="billing@academy.com" disabled />
            </div>
            <div class="input-group">
              <label>Card details</label>
              <div class="card-inputs">
                <div class="card-row">
                  <input class="input-field" type="text" value="4242  4242  4242  4242" disabled />
                </div>
                <input class="input-field" type="text" value="12 / 28" disabled />
                <input class="input-field" type="text" value="123" disabled />
              </div>
            </div>
            <div class="input-group">
              <label>Cardholder Name</label>
              <input class="input-field" type="text" value="Test Teacher" disabled />
            </div>
            <button class="pay-button" type="submit" id="submit-btn">
              <span id="btn-text">Pay $${planInfo.price}.00 & Upgrade</span>
              <div class="spinner" id="btn-spinner"></div>
            </button>
          </form>
          <a class="cancel-link" href="${cancelUrl}">Cancel and go back</a>
        </div>
      </div>

      <script>
        document.getElementById('payment-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const btnText = document.getElementById('btn-text');
          const btnSpinner = document.getElementById('btn-spinner');
          const submitBtn = document.getElementById('submit-btn');

          btnText.style.display = 'none';
          btnSpinner.style.display = 'block';
          submitBtn.disabled = true;

          try {
            // Trigger local mock checkout endpoint
            const res = await fetch('/api/billing/mock-checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orgId: '${orgId}',
                planName: '${plan}'
              })
            });
            const data = await res.json();
            
            if (data.success) {
              setTimeout(() => {
                window.location.href = '${successUrl}';
              }, 1200);
            } else {
              alert('Upgrade failed: ' + data.error);
              btnText.style.display = 'block';
              btnSpinner.style.display = 'none';
              submitBtn.disabled = false;
            }
          } catch(err) {
            alert('Payment simulation connection error.');
            btnText.style.display = 'block';
            btnSpinner.style.display = 'none';
            submitBtn.disabled = false;
          }
        });
      </script>
    </body>
    </html>
  `;
  res.send(html);
});

module.exports = router;
