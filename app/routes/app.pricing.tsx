import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useSubmit, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/* ------------------------------------------------------------------ */
/*  Plan metadata – pure constants, safe for client & server           */
/* ------------------------------------------------------------------ */
const PLAN_FREE = "Free";
const PLAN_PREMIUM = "Premium";
const PLAN_UNLIMITED = "Unlimited";

const PLANS = [
  {
    key: PLAN_FREE,
    name: "Free",
    price: 0,
    period: "month",
    description: "Get started with the essentials",
    features: [
      "Up to 2,000 views/month",
      "1 active announcement",
      "Basic customization",
      "Standard support",
    ],
    viewLimit: 2000,
    highlight: false,
  },
  {
    key: PLAN_PREMIUM,
    name: "Premium",
    price: 9,
    period: "month",
    description: "For growing businesses",
    features: [
      "Up to 50,000 views/month",
      "Unlimited announcements",
      "Advanced customization",
      "Countdown timers",
      "Cart goals",
      "Priority support",
    ],
    viewLimit: 50000,
    highlight: true,
  },
  {
    key: PLAN_UNLIMITED,
    name: "Unlimited",
    price: 29,
    period: "month",
    description: "For high-traffic stores",
    features: [
      "Unlimited views",
      "Unlimited announcements",
      "All premium features",
      "Custom CSS",
      "Customer targeting",
      "Dedicated support",
    ],
    viewLimit: Infinity,
    highlight: false,
  },
];

/* ------------------------------------------------------------------ */
/*  Loader – determine current plan from Shopify active subscriptions  */
/* ------------------------------------------------------------------ */
export async function loader({ request }: LoaderFunctionArgs) {
  const { billing, session } = await authenticate.admin(request);
  const isTestMode = process.env.SHOPIFY_TEST_MODE === "true";

  let currentPlan = PLAN_FREE;
  let subscriptionId: string | null = null;
  let renewalDate: string | null = null;

  // 1. Query active subscriptions from Shopify using billing.check()
  try {
    const billingResult = await billing.check({
      plans: [PLAN_PREMIUM, PLAN_UNLIMITED],
      isTest: isTestMode,
    });

    if (billingResult.hasActivePayment && billingResult.appSubscriptions?.length > 0) {
      const activeSub = billingResult.appSubscriptions.find(
        (sub: any) => sub.name === PLAN_PREMIUM || sub.name === PLAN_UNLIMITED
      );
      if (activeSub) {
        currentPlan = activeSub.name;
        subscriptionId = activeSub.id;
        if ((activeSub as any).currentPeriodEnd) {
          renewalDate = (activeSub as any).currentPeriodEnd;
        }
      }
    }
  } catch (err) {
    console.error("[Pricing Loader] Error checking billing status:", err);
  }

  // 2. Aggregate monthly views from AnnouncementAnalytics safely
  let currentViews = 0;
  try {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstOfMonthStr = firstOfMonth.toISOString().split("T")[0];

    const viewsResult = await prisma.announcementAnalytics.aggregate({
      where: {
        announcement: { shop: session.shop },
        date: { gte: firstOfMonthStr },
      },
      _sum: { views: true },
    });

    currentViews = viewsResult._sum.views ?? 0;
  } catch (err) {
    console.error("[Pricing Loader] Error querying analytics:", err);
  }

  // 3. Determine view limit based on current plan
  const planMeta = PLANS.find((p) => p.key === currentPlan);
  const viewLimit = planMeta?.viewLimit ?? 2000;

  // 4. Estimate renewal date if not available from subscription object
  if (!renewalDate) {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    renewalDate = nextMonth.toISOString().split("T")[0];
  }

  return {
    currentPlan,
    subscriptionId,
    currentViews,
    viewLimit: viewLimit === Infinity ? -1 : viewLimit, // -1 = unlimited
    renewalDate,
    isTestMode,
    plans: PLANS.map((p) => ({
      ...p,
      viewLimit: p.viewLimit === Infinity ? -1 : p.viewLimit,
    })),
  };
}

/* ------------------------------------------------------------------ */
/*  Action – handle plan selection & subscription cancellation         */
/* ------------------------------------------------------------------ */
export async function action({ request }: ActionFunctionArgs) {
  const { billing } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const isTestMode = process.env.SHOPIFY_TEST_MODE === "true";

  if (intent === "selectPlan") {
    const plan = String(formData.get("plan"));

    if (plan === PLAN_FREE) {
      // Downgrade to free – cancel any active subscription
      try {
        const billingCheck = await billing.check({
          plans: [PLAN_PREMIUM, PLAN_UNLIMITED],
          isTest: isTestMode,
        });
        if (billingCheck.appSubscriptions && billingCheck.appSubscriptions.length > 0) {
          for (const sub of billingCheck.appSubscriptions) {
            await billing.cancel({
              subscriptionId: sub.id,
              isTest: isTestMode,
              prorate: true,
            });
          }
        }
      } catch (err) {
        console.error("[Pricing Action] Error cancelling subscription:", err);
      }
      return { ok: true, plan: PLAN_FREE };
    }

    // For Premium or Unlimited, request billing redirect
    await billing.request({
      plan,
      isTest: isTestMode,
    });
  }

  if (intent === "cancelRenewal") {
    const subscriptionId = String(formData.get("subscriptionId"));
    if (subscriptionId) {
      try {
        await billing.cancel({
          subscriptionId,
          isTest: isTestMode,
          prorate: true,
        });
      } catch (err) {
        console.error("[Pricing Action] Error cancelling renewal:", err);
      }
    }
    return { ok: true, cancelled: true };
  }

  return { ok: false };
}

/* ------------------------------------------------------------------ */
/*  UI Component                                                       */
/* ------------------------------------------------------------------ */
export default function PricingPage() {
  const {
    currentPlan,
    subscriptionId,
    currentViews,
    viewLimit,
    renewalDate,
    isTestMode,
    plans,
  } = useLoaderData<typeof loader>();

  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

  const handleSelectPlan = (planKey: string) => {
    if (planKey === currentPlan || isSubmitting) return;
    setPendingPlan(planKey);
    submit(
      { intent: "selectPlan", plan: planKey },
      { method: "post" }
    );
  };

  const handleCancelRenewal = () => {
    if (!subscriptionId || isSubmitting) return;
    submit(
      { intent: "cancelRenewal", subscriptionId },
      { method: "post" }
    );
  };

  const viewLimitDisplay =
    viewLimit === -1 ? "Unlimited" : viewLimit.toLocaleString();
  const usagePercent =
    viewLimit === -1 ? 0 : Math.min(100, (currentViews / viewLimit) * 100);

  const formattedRenewalDate = renewalDate
    ? new Date(renewalDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <div className="pricing-wrapper">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* Header */}
      <div className="pricing-header">
        <div className="pricing-header-text">
          <h1>Pricing</h1>
          <p>Choose the plan that fits your business needs</p>
        </div>
        {isTestMode && (
          <span className="test-mode-badge">
            <span className="test-mode-dot"></span>
            Test Mode
          </span>
        )}
      </div>

      {/* Plan Cards */}
      <div className="plans-grid">
        {plans.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          const isLoading = isSubmitting && pendingPlan === plan.key;

          return (
            <div
              key={plan.key}
              className={`plan-card ${plan.highlight ? "plan-card-highlighted" : ""} ${isCurrent ? "plan-card-current" : ""}`}
            >
              {plan.highlight && (
                <div className="popular-badge">Most Popular</div>
              )}
              {isCurrent && (
                <div className="current-plan-badge">Current Plan</div>
              )}

              <div className="plan-card-header">
                <h2 className="plan-name">{plan.name}</h2>
                <p className="plan-description">{plan.description}</p>
                <div className="plan-price">
                  <span className="price-currency">$</span>
                  <span className="price-amount">{plan.price}</span>
                  <span className="price-period">/{plan.period}</span>
                </div>
              </div>

              <div className="plan-features">
                {plan.features.map((feature, i) => (
                  <div key={i} className="feature-item">
                    <svg className="feature-check" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M7.5 10l2 2 3.5-3.5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <button
                className={`plan-btn ${plan.highlight ? "plan-btn-primary" : ""} ${isCurrent ? "plan-btn-current" : ""}`}
                onClick={() => handleSelectPlan(plan.key)}
                disabled={isCurrent || isSubmitting}
                id={`select-plan-${plan.key.toLowerCase()}`}
              >
                {isLoading ? (
                  <span className="btn-spinner"></span>
                ) : isCurrent ? (
                  "Current Plan"
                ) : currentPlan !== PLAN_FREE &&
                  plan.key === PLAN_FREE ? (
                  "Downgrade"
                ) : (
                  "Select Plan"
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Usage Section */}
      <div className="usage-section">
        <h2 className="usage-title">Current Usage</h2>
        <div className="usage-grid">
          <div className="usage-card">
            <div className="usage-card-header">
              <span className="usage-card-label">Views This Month</span>
              <svg className="usage-card-icon" viewBox="0 0 20 20" fill="none">
                <path d="M10 4.5c-4 0-7 3.5-7 5.5s3 5.5 7 5.5 7-3.5 7-5.5-3-5.5-7-5.5z" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
            <div className="usage-card-value">
              {currentViews.toLocaleString()}
            </div>
            <div className="usage-progress-section">
              <div className="usage-progress-labels">
                <span>{currentViews.toLocaleString()} used</span>
                <span>{viewLimitDisplay}</span>
              </div>
              <div className="usage-progress-track">
                <div
                  className="usage-progress-fill"
                  style={{ width: `${usagePercent}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="usage-card">
            <div className="usage-card-header">
              <span className="usage-card-label">Current Plan</span>
              <svg className="usage-card-icon" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="5" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M3 9h14" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
            <div className="usage-card-value">{currentPlan}</div>
            <div className="usage-card-meta">
              {currentPlan === PLAN_FREE
                ? "No active subscription"
                : `$${plans.find((p: any) => p.key === currentPlan)?.price ?? 0}/month`}
            </div>
          </div>

          <div className="usage-card">
            <div className="usage-card-header">
              <span className="usage-card-label">View Limit</span>
              <svg className="usage-card-icon" viewBox="0 0 20 20" fill="none">
                <path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="usage-card-value">{viewLimitDisplay}</div>
            <div className="usage-card-meta">
              {viewLimit === -1 ? "No limits on your plan" : "Monthly view allowance"}
            </div>
          </div>

          <div className="usage-card">
            <div className="usage-card-header">
              <span className="usage-card-label">Renewal Date</span>
              <svg className="usage-card-icon" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M3 8h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="usage-card-value-sm">{formattedRenewalDate}</div>
            {currentPlan !== PLAN_FREE && subscriptionId && (
              <button
                className="cancel-renewal-btn"
                onClick={handleCancelRenewal}
                disabled={isSubmitting}
                id="cancel-renewal-btn"
              >
                Cancel Renewal
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                              */
/* ------------------------------------------------------------------ */
const STYLES = `
  .pricing-wrapper {
    padding: 32px;
    margin: 20px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #202223;
    background-color: #f6f6f7;
    min-height: 100vh;
  }

  /* Header */
  .pricing-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 32px;
  }

  .pricing-header-text h1 {
    font-size: 28px;
    font-weight: 700;
    margin: 0 0 6px 0;
    color: #202223;
  }

  .pricing-header-text p {
    font-size: 14px;
    color: #6d7175;
    margin: 0;
  }

  .test-mode-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    background: #fff3cd;
    color: #856404;
    border: 1px solid #ffc107;
  }

  .test-mode-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #ffc107;
    animation: pulse-dot 2s ease-in-out infinite;
  }

  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  /* Plans Grid */
  .plans-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin-bottom: 32px;
  }

  @media (max-width: 900px) {
    .plans-grid {
      grid-template-columns: 1fr;
      max-width: 440px;
      margin-left: auto;
      margin-right: auto;
    }
  }

  /* Plan Card */
  .plan-card {
    background: #ffffff;
    border: 1px solid #e3e3e3;
    border-radius: 14px;
    padding: 28px 24px;
    display: flex;
    flex-direction: column;
    position: relative;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    transition: box-shadow 0.25s ease, transform 0.2s ease, border-color 0.25s ease;
  }

  .plan-card:hover {
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
    transform: translateY(-2px);
  }

  .plan-card-highlighted {
    border-color: #1a1a1a;
    border-width: 2px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  }

  .plan-card-highlighted:hover {
    box-shadow: 0 12px 32px rgba(0,0,0,0.12);
  }

  .plan-card-current {
    border-color: #137333;
  }

  /* Badges */
  .popular-badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background: #1a1a1a;
    color: #ffffff;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 14px;
    border-radius: 20px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .current-plan-badge {
    position: absolute;
    top: -12px;
    right: 16px;
    background: #e6f4ea;
    color: #137333;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 14px;
    border-radius: 20px;
    letter-spacing: 0.3px;
    text-transform: uppercase;
    white-space: nowrap;
  }

  /* Plan Card Header */
  .plan-card-header {
    text-align: center;
    margin-bottom: 24px;
    padding-bottom: 24px;
    border-bottom: 1px solid #f1f2f3;
  }

  .plan-name {
    font-size: 20px;
    font-weight: 700;
    margin: 0 0 6px 0;
    color: #202223;
  }

  .plan-description {
    font-size: 13px;
    color: #6d7175;
    margin: 0 0 20px 0;
  }

  .plan-price {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 2px;
  }

  .price-currency {
    font-size: 22px;
    font-weight: 700;
    color: #202223;
    line-height: 1;
    vertical-align: top;
    margin-top: 4px;
  }

  .price-amount {
    font-size: 48px;
    font-weight: 800;
    color: #202223;
    line-height: 1;
    letter-spacing: -2px;
  }

  .price-period {
    font-size: 14px;
    color: #6d7175;
    font-weight: 500;
  }

  /* Features List */
  .plan-features {
    flex: 1;
    margin-bottom: 24px;
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 0;
    font-size: 13.5px;
    color: #303030;
  }

  .feature-check {
    width: 18px;
    height: 18px;
    min-width: 18px;
    color: #137333;
    background: #e6f4ea;
    border-radius: 50%;
    padding: 2px;
  }

  /* Plan Button */
  .plan-btn {
    width: 100%;
    padding: 12px 20px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid #e3e3e3;
    background: #ffffff;
    color: #202223;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 44px;
  }

  .plan-btn:hover:not(:disabled) {
    background: #f6f6f7;
    border-color: #c9cccf;
  }

  .plan-btn:active:not(:disabled) {
    transform: scale(0.98);
  }

  .plan-btn-primary {
    background: #1a1a1a;
    color: #ffffff;
    border-color: #1a1a1a;
  }

  .plan-btn-primary:hover:not(:disabled) {
    background: #333333;
    border-color: #333333;
  }

  .plan-btn-current {
    background: #e6f4ea;
    color: #137333;
    border-color: #b7e1cd;
    cursor: default;
  }

  .plan-btn-current:hover {
    background: #e6f4ea !important;
    border-color: #b7e1cd !important;
  }

  .plan-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  /* Spinner */
  .btn-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Usage Section */
  .usage-section {
    background: #ffffff;
    border: 1px solid #e3e3e3;
    border-radius: 14px;
    padding: 28px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }

  .usage-title {
    font-size: 18px;
    font-weight: 700;
    margin: 0 0 20px 0;
    color: #202223;
  }

  .usage-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
  }

  @media (max-width: 900px) {
    .usage-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 560px) {
    .usage-grid {
      grid-template-columns: 1fr;
    }
    .pricing-wrapper {
      padding: 16px;
      margin: 8px;
    }
    .pricing-header {
      flex-direction: column;
      gap: 12px;
    }
  }

  .usage-card {
    background: #f9fafb;
    border: 1px solid #ebebeb;
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
  }

  .usage-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .usage-card-label {
    font-size: 13px;
    color: #6d7175;
    font-weight: 500;
  }

  .usage-card-icon {
    width: 20px;
    height: 20px;
    color: #8c9196;
  }

  .usage-card-value {
    font-size: 28px;
    font-weight: 700;
    color: #202223;
    margin-bottom: 8px;
  }

  .usage-card-value-sm {
    font-size: 18px;
    font-weight: 700;
    color: #202223;
    margin-bottom: 8px;
  }

  .usage-card-meta {
    font-size: 12px;
    color: #8c9196;
    margin-top: auto;
  }

  /* Usage Progress */
  .usage-progress-section {
    margin-top: auto;
  }

  .usage-progress-labels {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #6d7175;
    margin-bottom: 6px;
  }

  .usage-progress-track {
    width: 100%;
    height: 6px;
    background-color: #e3e3e3;
    border-radius: 3px;
    overflow: hidden;
  }

  .usage-progress-fill {
    height: 100%;
    background-color: #1a1a1a;
    border-radius: 3px;
    transition: width 0.4s ease;
    min-width: 2px;
  }

  /* Cancel Button */
  .cancel-renewal-btn {
    margin-top: auto;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid #e3e3e3;
    background: #ffffff;
    color: #d32f2f;
    transition: all 0.2s ease;
    width: 100%;
  }

  .cancel-renewal-btn:hover:not(:disabled) {
    background: #ffebee;
    border-color: #ef9a9a;
  }

  .cancel-renewal-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
