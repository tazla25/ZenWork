// ZenWork Razorpay Integration
// Handles: Plan creation, subscription management, payment verification

import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

// Plan IDs (create these in Razorpay Dashboard first):
// - plan_zenwork_pro_monthly: ₹199/month
// - plan_zenwork_pro_annual: ₹1,499/year
// - plan_zenwork_team_monthly: ₹999/month (25 seats)
// - plan_zenwork_business_monthly: ₹2,499/month (100 seats)

export async function createSubscription({
  planId,
  userId,
  userEmail,
  userName,
  totalCount = 12,
  quantity = 1
}: {
  planId: string;
  userId: string;
  userEmail: string;
  userName: string;
  totalCount?: number;
  quantity?: number;
}) {
  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: totalCount,
      quantity: quantity,
      customer_notify: 1,
      notes: {
        user_id: userId,
        product: 'zenwork'
      }
    });

    return {
      success: true,
      subscriptionId: subscription.id,
      shortUrl: subscription.short_url
    };
  } catch (error: any) {
    console.error('Subscription creation failed:', error);
    return { success: false, error: error.message };
  }
}

import crypto from 'crypto';

export function verifyPaymentSignature({
  razorpayPaymentId,
  razorpaySubscriptionId,
  razorpaySignature
}: {
  razorpayPaymentId: string;
  razorpaySubscriptionId: string;
  razorpaySignature: string;
}) {
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpayPaymentId}|${razorpaySubscriptionId}`)
    .digest('hex');

  return generatedSignature === razorpaySignature;
}

export async function handleWebhook(req: Request) {
  const signature = req.headers.get('x-razorpay-signature');
  const body = await req.text();

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex');

  if (signature !== expectedSignature) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
  }

  const event = JSON.parse(body);
  const payload = event.payload;

  switch (event.event) {
    case 'subscription.activated':
      await handleSubscriptionActivated(payload.subscription.entity);
      break;
    case 'subscription.charged':
      await handleSubscriptionCharged(payload.subscription.entity);
      break;
    case 'subscription.cancelled':
      await handleSubscriptionCancelled(payload.subscription.entity);
      break;
    default:
      console.log(`Unhandled webhook event: ${event.event}`);
  }

  return new Response(JSON.stringify({ received: true }));
}

async function handleSubscriptionActivated(subscription: any) {
  const { createServerClient } = await import('./supabase');
  const supabase = createServerClient();
  const userId = subscription.notes?.user_id;

  await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      razorpay_subscription_id: subscription.id,
      plan_tier: getPlanTier(subscription.plan_id),
      status: 'active',
      current_period_start: new Date(subscription.current_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_end * 1000).toISOString()
    });
}

async function handleSubscriptionCharged(subscription: any) {
  const { createServerClient } = await import('./supabase');
  const supabase = createServerClient();

  await supabase
    .from('subscriptions')
    .update({
      current_period_end: new Date(subscription.current_end * 1000).toISOString(),
      status: 'active'
    })
    .eq('razorpay_subscription_id', subscription.id);
}

async function handleSubscriptionCancelled(subscription: any) {
  const { createServerClient } = await import('./supabase');
  const supabase = createServerClient();

  await supabase
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('razorpay_subscription_id', subscription.id);
}

function getPlanTier(planId: string) {
  if (planId.includes('pro')) return 'pro';
  if (planId.includes('team')) return 'team';
  if (planId.includes('business')) return 'business';
  return 'free';
}
