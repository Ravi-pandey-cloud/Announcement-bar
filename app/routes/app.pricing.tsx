import { useState, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";


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
    console.error("[Pricing] Billing check error:", err);
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
      console.error("[Pricing] DB plan lookup error:", dbErr);
    }
  }

  // Calculate views for current month
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
    console.error("[Pricing] Analytics error:", err);
  }

  const planMeta = PLANS.find((p) => p.key === currentPlan);
  const viewLimit = planMeta?.viewLimit ?? 2000;

  // Persist current plan to database
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
    console.error("[Pricing] DB plan persistence error:", dbErr);
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
        console.error("[Pricing] Cancellation error:", err);
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
        console.error("[Pricing] DB plan update error:", dbErr);
      }

      return { ok: true, plan: PLAN_FREE };
    }

    try {
      return await billing.request({
        plan: plan as "Premium" | "Unlimited",
        isTest: isTestMode,
      });
    } catch (err: any) {
      console.error("[Pricing] billing.request error:", err);

      let redirectUrl: string | null = null;
      if (err instanceof Response) {
        redirectUrl =
          err.headers.get("X-Shopify-API-Request-Failure-Reauthorize-Url") ||
          err.headers.get("x-shopify-api-request-failure-reauthorize-url") ||
          err.headers.get("Location") ||
          err.headers.get("location");
      }

      if (redirectUrl) {
        return { ok: true, redirectUrl };
      }

      if (isTestMode) {
        try {
          const targetPlanMeta = PLANS.find((p) => p.key === plan);
          const newLimit = targetPlanMeta?.viewLimit ?? 2000;
          await prisma.shopPlan.upsert({
            where: { shop: session.shop },
            update: {
              plan,
              subscriptionId: `test_sub_${Date.now()}`,
              viewLimit: newLimit === Infinity ? -1 : newLimit,
              status: "ACTIVE",
            },
            create: {
              shop: session.shop,
              plan,
              subscriptionId: `test_sub_${Date.now()}`,
              viewLimit: newLimit === Infinity ? -1 : newLimit,
              status: "ACTIVE",
            },
          });
          return { ok: true, plan, isTestMode: true };
        } catch (dbErr) {
          console.error("[Pricing] DB update error during test fallback:", dbErr);
        }
      }

      let errMsg = "Billing API requires public distribution. Change app distribution to Public in the Shopify Partner Dashboard.";
      if (err instanceof Error) {
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
        console.error("[Pricing] Cancel renewal error:", err);
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
      console.error("[Pricing] DB plan update error:", dbErr);
    }

    return { ok: true, cancelled: true };
  }

  return { ok: false };
}


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

  useEffect(() => {
    if (actionData && (actionData as any).redirectUrl) {
      const url = (actionData as any).redirectUrl;
      if (window.top) {
        window.top.location.href = url;
      } else {
        window.location.href = url;
      }
    }
  }, [actionData]);

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
    <div className="pricing-wrapper">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* Error Banner */}
      {actionError && (
        <div className="pricing-error-banner">
          <strong>Billing Error:</strong> {actionError}
          {String(actionError).includes("public distribution") && (
            <span> — Go to <strong>Shopify Partners → Apps → Distribution</strong> and set to <strong>Public</strong> to enable billing.</span>
          )}
        </div>
      )}

      {/* Top Info Banner Card (Matching Screenshot Header Card) */}
      <div className="top-info-card">
        <div className="top-info-header">
          <h1>Choose the right plan for your store</h1>
          {isTestMode && (
            <span className="test-badge">Test Mode Active</span>
          )}
        </div>
        <p>
          All new installs start on the Free plan. Upgrade when you need advanced features included in paid plans. Paid plans include: Product grouping, Hydrogen iframe support, Headless API support, Remove app branding.
        </p>
      </div>

      {/* Pricing Cards Grid (Matching Screenshot Cards) */}
      <div className="pricing-grid">
        {plans.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          const isLoading = isSubmitting && pendingPlan === plan.key;

          return (
            <div key={plan.key} className="plan-card">
              {/* Card Title & Current Plan Pill */}
              <div className="card-top-row">
                <h2 className="plan-title">{plan.name}</h2>
                {isCurrent && <span className="badge-current">Current plan</span>}
              </div>

              {/* Huge Price */}
              <div className="price-box">
                {plan.price === 0 ? (
                  <span className="price-amount">Free</span>
                ) : (
                  <>
                    <span className="price-amount">${plan.price}</span>
                    <span className="price-period">/ month</span>
                  </>
                )}
              </div>

              <div className="card-divider" />

              {/* Bullet Features List */}
              <div className="features-section">
                <div className="features-header-text">Features</div>
                <ul className="bullet-features-list">
                  {plan.features.map((feat, i) => (
                    <li key={i}>{feat}</li>
                  ))}
                </ul>
              </div>

              {/* Card Action Button */}
              <div className="card-bottom">
                <button
                  className={`plan-action-btn ${isCurrent ? "disabled-btn" : "upgrade-btn"}`}
                  onClick={() => handleSelectPlan(plan.key)}
                  disabled={isCurrent || isSubmitting}
                  id={`select-plan-${plan.key.toLowerCase()}`}
                >
                  {isLoading ? (
                    <span className="btn-spinner"></span>
                  ) : isCurrent ? (
                    `${plan.name === "Free" ? "Free plan" : "Current plan"}`
                  ) : currentPlan !== PLAN_FREE && plan.key === PLAN_FREE ? (
                    "Downgrade to Free"
                  ) : (
                    `Upgrade to ${plan.name}`
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Usage Analytics Bottom Card */}
      <div className="bottom-usage-card">
        <h2 className="usage-title">Current plan usage</h2>
        <div className="usage-row">
          <div className="usage-stat">
            <span className="stat-label">Views Used This Month</span>
            <div className="stat-num">{currentViews.toLocaleString()} / {viewLimitDisplay}</div>
            <div className="usage-track">
              <div className="usage-fill" style={{ width: `${usagePercent}%` }} />
            </div>
          </div>
          <div className="usage-stat">
            <span className="stat-label">Active Subscription Tier</span>
            <div className="stat-num">{currentPlan}</div>
            <span className="stat-sub">{currentPlan === PLAN_FREE ? "Free Tier ($0/month)" : `$${plans.find(p => p.key === currentPlan)?.price ?? 0} / month`}</span>
          </div>
          <div className="usage-stat">
            <span className="stat-label">Next Renewal Date</span>
            <div className="stat-num">{formattedRenewalDate}</div>
            {currentPlan !== PLAN_FREE && subscriptionId && (
              <button className="cancel-link-btn" onClick={handleCancelRenewal} disabled={isSubmitting}>
                Cancel Renewal
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


const STYLES = `
  .pricing-wrapper {
    padding: 32px;
    margin: 0 auto;
    max-width: 1100px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #202223;
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

  /* Top Info Banner Card */
  .top-info-card {
    background: #ffffff;
    border: 1px solid #e3e3e3;
    border-radius: 14px;
    padding: 24px 28px;
    margin-bottom: 24px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
  }

  .top-info-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .top-info-card h1 {
    font-size: 22px;
    font-weight: 700;
    margin: 0;
    color: #1a1a1a;
  }

  .test-badge {
    background: #fff3cd;
    color: #856404;
    border: 1px solid #ffeeba;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
  }

  .top-info-card p {
    font-size: 14px;
    color: #6d7175;
    margin: 0;
    line-height: 1.5;
  }

  /* Pricing Cards Grid */
  .pricing-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
  }

  /* Individual Plan Card */
  .plan-card {
    background: #ffffff;
    border: 1px solid #e3e3e3;
    border-radius: 16px;
    padding: 28px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
  }

  .card-top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .plan-title {
    font-size: 22px;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0;
  }

  .badge-current {
    background: #b8f2d0;
    color: #0f5132;
    padding: 4px 12px;
    border-radius: 14px;
    font-size: 13px;
    font-weight: 600;
  }

  .price-box {
    margin-bottom: 20px;
  }

  .price-amount {
    font-size: 36px;
    font-weight: 700;
    color: #1a1a1a;
  }

  .price-period {
    font-size: 14px;
    color: #6d7175;
    margin-left: 4px;
    font-weight: 400;
  }

  .card-divider {
    border-bottom: 1px solid #f1f1f1;
    margin-bottom: 20px;
  }

  /* Features List with Bullets */
  .features-section {
    flex: 1;
    margin-bottom: 28px;
  }

  .features-header-text {
    font-size: 14px;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 12px;
  }

  .bullet-features-list {
    margin: 0;
    padding-left: 20px;
    list-style-type: disc;
  }

  .bullet-features-list li {
    font-size: 14px;
    color: #303030;
    margin-bottom: 10px;
    line-height: 1.5;
  }

  /* Buttons */
  .card-bottom {
    margin-top: auto;
  }

  .plan-action-btn {
    width: 100%;
    padding: 12px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    text-align: center;
    box-sizing: border-box;
    transition: background 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
  }

  .disabled-btn {
    background: #f1f2f3;
    color: #8c9196;
    border: none;
    cursor: not-allowed;
  }

  .upgrade-btn {
    background: linear-gradient(180deg, #303030 0%, #1a1a1a 100%);
    color: #ffffff;
    border: 1px solid #1a1a1a;
    cursor: pointer;
  }

  .upgrade-btn:hover:not(:disabled) {
    background: linear-gradient(180deg, #444444 0%, #2b2b2b 100%);
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

  /* Usage Overview Bottom Card */
  .bottom-usage-card {
    background: #ffffff;
    border: 1px solid #e3e3e3;
    border-radius: 14px;
    padding: 24px 28px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
  }

  .usage-title {
    font-size: 18px;
    font-weight: 700;
    margin: 0 0 16px 0;
    color: #1a1a1a;
  }

  .usage-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
  }

  .usage-stat {
    display: flex;
    flex-direction: column;
  }

  .stat-label {
    font-size: 13px;
    color: #6d7175;
    margin-bottom: 4px;
  }

  .stat-num {
    font-size: 18px;
    font-weight: 700;
    color: #1a1a1a;
  }

  .stat-sub {
    font-size: 12px;
    color: #6d7175;
    margin-top: 4px;
  }

  .usage-track {
    width: 100%;
    height: 6px;
    background: #f1f2f3;
    border-radius: 3px;
    overflow: hidden;
    margin-top: 6px;
  }

  .usage-fill {
    height: 100%;
    background: #1a1a1a;
    border-radius: 3px;
  }

  .cancel-link-btn {
    margin-top: 6px;
    padding: 4px 8px;
    font-size: 12px;
    color: #d32f2f;
    background: none;
    border: 1px solid #ffcdd2;
    border-radius: 4px;
    cursor: pointer;
  }

  .cancel-link-btn:hover {
    background: #ffebee;
  }
`;
