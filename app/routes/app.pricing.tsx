import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/* ------------------------------------------------------------------ */
/*  Plan Constants – MUST match keys in shopify.server.ts             */
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
    description: "Ideal for new stores getting started",
    viewLimit: 2000,
    badge: null,
    features: [
      "Up to 2,000 views / month",
      "1 active announcement bar",
      "Basic style & color customization",
      "Standard support",
    ],
  },
  {
    key: PLAN_PREMIUM,
    name: "Premium",
    price: 9,
    period: "month",
    description: "For growing stores needing advanced sales features",
    viewLimit: 50000,
    badge: "Popular",
    features: [
      "Up to 50,000 views / month",
      "Unlimited active announcements",
      "Countdown timer bars",
      "Cart goal free shipping bars",
      "Multiple bar rotation (carousel & scroll)",
      "Priority support",
    ],
  },
  {
    key: PLAN_UNLIMITED,
    name: "Unlimited",
    price: 29,
    period: "month",
    description: "For high-traffic stores with no limits",
    viewLimit: Infinity,
    badge: null,
    features: [
      "Unlimited views",
      "Unlimited active announcements",
      "All Premium features included",
      "Custom CSS styling",
      "Customer tag targeting",
      "Dedicated support",
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Helper – Deterministic date formatter to prevent SSR mismatch     */
/* ------------------------------------------------------------------ */
function formatDateString(dateStr: string | null) {
  if (!dateStr) return "—";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const year = parts[0];
    const monthNum = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthName = monthNames[monthNum - 1] || parts[1];
    return `${monthName} ${day}, ${year}`;
  }
  return dateStr;
}

/* ------------------------------------------------------------------ */
/*  Loader – retrieve active subscription & usage data from Shopify   */
/* ------------------------------------------------------------------ */
export async function loader({ request }: LoaderFunctionArgs) {
  const { billing, session } = await authenticate.admin(request);
  const isTestMode = process.env.SHOPIFY_TEST_MODE === "true";

  let currentPlan = PLAN_FREE;
  let subscriptionId: string | null = null;
  let renewalDate: string | null = null;

  // 1. Query active subscription from Shopify
  try {
    const billingResult = await billing.check({ isTest: isTestMode });
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
    console.error("[Pricing Loader] Billing check error (will check DB):", err);
  }

  // 2. If Shopify billing has no active payment, read saved plan from database (ShopPlan table)
  if (currentPlan === PLAN_FREE) {
    try {
      const dbPlan = await prisma.shopPlan.findUnique({
        where: { shop: session.shop },
      });
      if (dbPlan && dbPlan.status === "ACTIVE") {
        currentPlan = dbPlan.plan;
        if (dbPlan.subscriptionId) {
          subscriptionId = dbPlan.subscriptionId;
        }
      }
    } catch (dbErr) {
      console.error("[Pricing Loader] DB plan lookup error:", dbErr);
    }
  }

  // 3. Calculate views for current month safely
  let currentViews = 0;
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const firstOfMonthStr = `${year}-${month}-01`;

    const viewsResult = await prisma.announcementAnalytics.aggregate({
      where: {
        announcement: { shop: session.shop },
        date: { gte: firstOfMonthStr },
      },
      _sum: { views: true },
    });

    currentViews = viewsResult._sum.views ?? 0;
  } catch (err) {
    console.error("[Pricing Loader] Analytics error:", err);
  }

  const planMeta = PLANS.find((p) => p.key === currentPlan);
  const viewLimit = planMeta?.viewLimit ?? 2000;

  // 4. Persist current plan to database (ShopPlan table)
  try {
    await prisma.shopPlan.upsert({
      where: { shop: session.shop },
      update: {
        plan: currentPlan,
        subscriptionId: subscriptionId,
        viewLimit: viewLimit === Infinity ? -1 : viewLimit,
        status: "ACTIVE",
      },
      create: {
        shop: session.shop,
        plan: currentPlan,
        subscriptionId: subscriptionId,
        viewLimit: viewLimit === Infinity ? -1 : viewLimit,
        status: "ACTIVE",
      },
    });
  } catch (dbErr) {
    console.error("[Pricing Loader] DB plan persistence error:", dbErr);
  }

  if (!renewalDate) {
    const now = new Date();
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const year = nextMonthDate.getFullYear();
    const month = String(nextMonthDate.getMonth() + 1).padStart(2, "0");
    renewalDate = `${year}-${month}-01`;
  }

  return {
    currentPlan,
    subscriptionId,
    currentViews,
    viewLimit: viewLimit === Infinity ? -1 : viewLimit,
    renewalDate,
    isTestMode,
    plans: PLANS.map((p) => ({
      ...p,
      viewLimit: p.viewLimit === Infinity ? -1 : p.viewLimit,
    })),
  };
}

/* ------------------------------------------------------------------ */
/*  Action – process plan selection & subscription cancellation       */
/* ------------------------------------------------------------------ */
export async function action({ request }: ActionFunctionArgs) {
  const { billing, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const isTestMode = process.env.SHOPIFY_TEST_MODE === "true";

  if (intent === "selectPlan") {
    const plan = String(formData.get("plan"));

    if (plan === PLAN_FREE) {
      // Downgrade to Free plan
      try {
        const billingCheck = await billing.check({ isTest: isTestMode });
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
        console.error("[Pricing Action] Cancellation error:", err);
      }

      // Persist Free plan to ShopPlan table
      try {
        await prisma.shopPlan.upsert({
          where: { shop: session.shop },
          update: {
            plan: PLAN_FREE,
            subscriptionId: null,
            viewLimit: 2000,
            status: "ACTIVE",
          },
          create: {
            shop: session.shop,
            plan: PLAN_FREE,
            subscriptionId: null,
            viewLimit: 2000,
            status: "ACTIVE",
          },
        });
      } catch (dbErr) {
        console.error("[Pricing Action] DB plan update error:", dbErr);
      }

      return { ok: true, plan: PLAN_FREE };
    }

    // Request billing from Shopify
    try {
      return await billing.request({
        plan,
        isTest: isTestMode,
      });
    } catch (err: any) {
      console.error("[Pricing Action] billing.request caught:", err);

      // Check if err is a Shopify App Bridge / Billing redirect Response
      const hasReauthHeader =
        err instanceof Response &&
        (err.headers.has("X-Shopify-API-Request-Failure-Reauthorize-Url") ||
         err.headers.has("x-shopify-api-request-failure-reauthorize-url") ||
         err.headers.has("Location") ||
         err.headers.has("location"));

      const isStatusRedirect =
        (err instanceof Response && err.status >= 300 && err.status < 400) ||
        (err && typeof err === "object" && typeof err.status === "number" && err.status >= 300 && err.status < 400);

      if (hasReauthHeader || isStatusRedirect) {
        console.log("[Pricing Action] Re-throwing redirect for Shopify Billing approval page");
        throw err;
      }

      // Return user-friendly error banner if billing API fails (e.g., non-public distribution)
      let errMsg = "Unable to process payment request with Shopify Billing API.";
      if (err instanceof Response) {
        errMsg = `Shopify Billing Error (${err.status}: ${err.statusText || "Unauthorized"}). Make sure App Distribution is set to Public in Shopify Partners.`;
      } else if (err instanceof Error) {
        errMsg = err.message;
      } else if (err?.errorData?.[0]?.message) {
        errMsg = err.errorData[0].message;
      }

      return { ok: false, error: errMsg };
    }
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
        console.error("[Pricing Action] Cancel renewal error:", err);
      }
    }

    try {
      await prisma.shopPlan.upsert({
        where: { shop: session.shop },
        update: {
          plan: PLAN_FREE,
          subscriptionId: null,
          viewLimit: 2000,
          status: "ACTIVE",
        },
        create: {
          shop: session.shop,
          plan: PLAN_FREE,
          subscriptionId: null,
          viewLimit: 2000,
          status: "ACTIVE",
        },
      });
    } catch (dbErr) {
      console.error("[Pricing Action] DB plan update error:", dbErr);
    }

    return { ok: true, cancelled: true };
  }

  return { ok: false };
}

/* ------------------------------------------------------------------ */
/*  UI Component – Clean, simple design matching app.help.tsx          */
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
  const actionData = useActionData<typeof action>();
  const isSubmitting = navigation.state === "submitting";
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const actionError = (actionData as any)?.error || null;

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
    if (confirm("Are you sure you want to cancel your plan renewal? You will be downgraded to the Free plan at the end of your billing cycle.")) {
      submit(
        { intent: "cancelRenewal", subscriptionId },
        { method: "post" }
      );
    }
  };

  const viewLimitDisplay =
    viewLimit === -1 ? "Unlimited" : viewLimit.toLocaleString();
  const usagePercent =
    viewLimit === -1 ? 0 : Math.min(100, Math.round((currentViews / viewLimit) * 100));

  const formattedRenewalDate = formatDateString(renewalDate);

  return (
    <div className="pricing-container">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* Action Error Banner if billing failed */}
      {actionError && (
        <div className="pricing-error-banner">
          <strong>Billing Error:</strong> {actionError}
          {String(actionError).includes("public distribution") && (
            <span> — Go to <strong>Shopify Partners → Apps → Distribution</strong> and set to <strong>Public</strong> to enable billing.</span>
          )}
        </div>
      )}

      {/* Header Banner */}
      <div className="pricing-page-header">
        <div>
          <h1>Plans & Billing</h1>
          <p>Select the plan that fits your business needs. Upgrade or downgrade anytime.</p>
        </div>
        {isTestMode && (
          <span className="test-mode-tag">
            <span className="test-dot"></span>
            Test Mode Active
          </span>
        )}
      </div>

      {/* Pricing Cards Grid */}
      <div className="pricing-cards-grid">
        {plans.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          const isLoading = isSubmitting && pendingPlan === plan.key;
          const isFeatured = plan.key === PLAN_PREMIUM;

          return (
            <div
              key={plan.key}
              className={`pricing-card ${isFeatured ? "featured" : ""} ${isCurrent ? "active-plan" : ""}`}
            >
              {isFeatured && !isCurrent && (
                <div className="badge-popular">Most Popular</div>
              )}
              {isCurrent && (
                <div className="badge-current">Current Plan</div>
              )}

              <div className="card-top">
                <h2 className="plan-title">{plan.name}</h2>
                <p className="plan-desc">{plan.description}</p>
                <div className="price-row">
                  <span className="price-num">${plan.price}</span>
                  <span className="price-unit">/{plan.period}</span>
                </div>
              </div>

              <div className="features-container">
                <div className="features-title">Features included:</div>
                <ul className="features-list">
                  {plan.features.map((feat, i) => (
                    <li key={i}>
                      <span className="check-icon">✓</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card-bottom">
                <button
                  className={`btn-select ${isCurrent ? "btn-active" : isFeatured ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => handleSelectPlan(plan.key)}
                  disabled={isCurrent || isSubmitting}
                  id={`select-plan-${plan.key.toLowerCase()}`}
                >
                  {isLoading ? (
                    <span className="btn-spinner"></span>
                  ) : isCurrent ? (
                    "Current Plan"
                  ) : currentPlan !== PLAN_FREE && plan.key === PLAN_FREE ? (
                    "Downgrade to Free"
                  ) : (
                    "Select Plan"
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Usage Overview Section */}
      <div className="usage-overview-card">
        <h2 className="section-title">Current Plan Usage</h2>
        <div className="usage-metrics-grid">
          <div className="metric-box">
            <span className="metric-label">Views Used This Month</span>
            <div className="metric-value">{currentViews.toLocaleString()}</div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${usagePercent}%` }}></div>
            </div>
            <span className="metric-sub">{currentViews.toLocaleString()} of {viewLimitDisplay} views ({usagePercent}%)</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Current Active Plan</span>
            <div className="metric-value">{currentPlan}</div>
            <span className="metric-sub">
              {currentPlan === PLAN_FREE ? "Free Tier ($0/month)" : `$${plans.find((p) => p.key === currentPlan)?.price ?? 0}/month`}
            </span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Monthly View Limit</span>
            <div className="metric-value">{viewLimitDisplay}</div>
            <span className="metric-sub">
              {viewLimit === -1 ? "Unlimited view allowance" : "Resets on 1st of every month"}
            </span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Renewal Date</span>
            <div className="metric-value-sm">{formattedRenewalDate}</div>
            {currentPlan !== PLAN_FREE && subscriptionId && (
              <button
                className="btn-cancel-renewal"
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
/*  Styles – Clean, simple layout matching app.help.tsx & app._index  */
/* ------------------------------------------------------------------ */
const STYLES = `
  .pricing-container {
    padding: 32px;
    margin: 20px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #202223;
    background-color: #f6f6f7;
    min-height: 100vh;
    box-sizing: border-box;
  }

  .pricing-error-banner {
    background: #fdecea;
    color: #b71c1c;
    border: 1px solid #f5c6cb;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 14px;
  }

  /* Header */
  .pricing-page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 28px;
  }

  .pricing-page-header h1 {
    font-size: 28px;
    font-weight: 700;
    margin: 0 0 6px 0;
    color: #202223;
  }

  .pricing-page-header p {
    font-size: 14px;
    color: #6d7175;
    margin: 0;
  }

  .test-mode-tag {
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

  .test-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #ffc107;
  }

  /* Pricing Cards Grid */
  .pricing-cards-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    margin-bottom: 32px;
  }

  @media (max-width: 900px) {
    .pricing-cards-grid {
      grid-template-columns: 1fr;
    }
    .pricing-container {
      padding: 16px;
      margin: 8px;
    }
  }

  /* Card */
  .pricing-card {
    background: #ffffff;
    border: 1px solid #e3e3e3;
    border-radius: 12px;
    padding: 28px;
    display: flex;
    flex-direction: column;
    position: relative;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }

  .pricing-card.featured {
    border: 2px solid #1a1a1a;
  }

  .pricing-card.active-plan {
    border: 2px solid #137333;
  }

  /* Badges */
  .badge-popular {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background: #1a1a1a;
    color: #ffffff;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 12px;
    border-radius: 12px;
    text-transform: uppercase;
  }

  .badge-current {
    position: absolute;
    top: -12px;
    right: 20px;
    background: #e6f4ea;
    color: #137333;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 12px;
    border-radius: 12px;
    text-transform: uppercase;
  }

  .card-top {
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid #f1f2f3;
  }

  .plan-title {
    font-size: 22px;
    font-weight: 700;
    margin: 0 0 6px 0;
    color: #202223;
  }

  .plan-desc {
    font-size: 13px;
    color: #6d7175;
    margin: 0 0 16px 0;
    min-height: 36px;
  }

  .price-row {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }

  .price-num {
    font-size: 38px;
    font-weight: 800;
    color: #202223;
  }

  .price-unit {
    font-size: 14px;
    color: #6d7175;
  }

  /* Features List */
  .features-container {
    flex: 1;
    margin-bottom: 24px;
  }

  .features-title {
    font-size: 12px;
    font-weight: 700;
    color: #202223;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 12px;
  }

  .features-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .features-list li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 14px;
    color: #303030;
    margin-bottom: 10px;
    line-height: 1.4;
  }

  .check-icon {
    color: #137333;
    font-weight: 700;
  }

  /* Buttons */
  .card-bottom {
    margin-top: auto;
  }

  .btn-select {
    width: 100%;
    padding: 12px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid #c9cccf;
    background: #ffffff;
    color: #202223;
    transition: background 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
  }

  .btn-select:hover:not(:disabled) {
    background: #f6f6f7;
  }

  .btn-primary {
    background: #1a1a1a;
    color: #ffffff;
    border-color: #1a1a1a;
  }

  .btn-primary:hover:not(:disabled) {
    background: #333333;
  }

  .btn-active {
    background: #e6f4ea;
    color: #137333;
    border-color: #b7e1cd;
    cursor: default;
  }

  .btn-select:disabled {
    opacity: 0.8;
  }

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

  /* Usage Overview Card */
  .usage-overview-card {
    background: #ffffff;
    border: 1px solid #e3e3e3;
    border-radius: 12px;
    padding: 28px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }

  .section-title {
    font-size: 18px;
    font-weight: 700;
    margin: 0 0 20px 0;
    color: #202223;
  }

  .usage-metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
  }

  @media (max-width: 900px) {
    .usage-metrics-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 500px) {
    .usage-metrics-grid {
      grid-template-columns: 1fr;
    }
  }

  .metric-box {
    background: #f9fafb;
    border: 1px solid #ebebeb;
    border-radius: 10px;
    padding: 18px;
    display: flex;
    flex-direction: column;
  }

  .metric-label {
    font-size: 13px;
    color: #6d7175;
    font-weight: 500;
    margin-bottom: 8px;
  }

  .metric-value {
    font-size: 26px;
    font-weight: 700;
    color: #202223;
    margin-bottom: 8px;
  }

  .metric-value-sm {
    font-size: 16px;
    font-weight: 700;
    color: #202223;
    margin-bottom: 8px;
  }

  .metric-sub {
    font-size: 12px;
    color: #6d7175;
    margin-top: auto;
  }

  .progress-bar-bg {
    width: 100%;
    height: 6px;
    background: #e3e3e3;
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 6px;
  }

  .progress-bar-fill {
    height: 100%;
    background: #1a1a1a;
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .btn-cancel-renewal {
    margin-top: auto;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid #e3e3e3;
    background: #ffffff;
    color: #d32f2f;
    width: 100%;
  }

  .btn-cancel-renewal:hover:not(:disabled) {
    background: #ffebee;
    border-color: #ef9a9a;
  }
`;
