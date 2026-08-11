import { useState, useEffect } from "react";
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
      console.error("[Pricing Action] billing.request caught exception:", err);

      // Extract redirect URL if Shopify threw an App Bridge redirect Response
      let redirectUrl: string | null = null;
      if (err instanceof Response) {
        redirectUrl =
          err.headers.get("X-Shopify-API-Request-Failure-Reauthorize-Url") ||
          err.headers.get("x-shopify-api-request-failure-reauthorize-url") ||
          err.headers.get("Location") ||
          err.headers.get("location");
      }

      // If a redirect URL exists (e.g. Shopify Charge Approval screen), return JSON redirectUrl!
      // This prevents React Router from catching a thrown 401 Response and crashing!
      if (redirectUrl) {
        console.log("[Pricing Action] Returning JSON redirectUrl for client top-level redirect:", redirectUrl);
        return { ok: true, redirectUrl };
      }

      // If billing.request failed without a redirect URL (e.g. app has Custom distribution or in dev test mode)
      if (isTestMode) {
        console.log(`[Pricing Action] Test Mode Fallback: Updating ShopPlan for ${session.shop} to ${plan}`);
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
          console.error("[Pricing Action] DB update error during test fallback:", dbErr);
        }
      }

      // Format clean error message for production
      let errMsg = "Apps without a public distribution cannot use the Billing API. Change app distribution to Public in Shopify Partner Dashboard.";
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

  useEffect(() => {
    if (actionData && (actionData as any).redirectUrl) {
      const url = (actionData as any).redirectUrl;
      console.log("[Pricing Page] Navigating top-level window to Shopify Billing Approval URL:", url);
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
        <div className="pricing-alert error">
          <svg className="alert-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <strong>Billing Error:</strong> {actionError}
            {String(actionError).includes("public distribution") && (
              <span className="alert-sub"> — Go to <strong>Shopify Partners → Apps → Distribution</strong> and set to <strong>Public</strong> to enable live billing.</span>
            )}
          </div>
        </div>
      )}

      {/* Header Card */}
      <div className="pricing-header-card">
        <div className="header-text">
          <div className="header-badge">
            <span className="badge-sparkle">✨</span> Flexible Pricing for Growing Stores
          </div>
          <h1>Choose the Perfect Plan for Your Store</h1>
          <p>Supercharge your sales with high-converting announcement bars, countdown timers, and free shipping bars.</p>
        </div>
        {isTestMode && (
          <div className="test-mode-pill">
            <span className="pulse-dot"></span>
            Test Mode Active
          </div>
        )}
      </div>

      {/* Pricing Cards Grid */}
      <div className="pricing-cards-container">
        {plans.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          const isLoading = isSubmitting && pendingPlan === plan.key;
          const isFeatured = plan.key === PLAN_PREMIUM;

          return (
            <div
              key={plan.key}
              className={`plan-card ${isFeatured ? "featured-card" : ""} ${isCurrent ? "active-card" : ""}`}
            >
              {isFeatured && !isCurrent && (
                <div className="ribbon-popular">
                  <span>MOST POPULAR</span>
                </div>
              )}
              {isCurrent && (
                <div className="ribbon-current">
                  <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Active Plan
                </div>
              )}

              <div className="plan-card-header">
                <h2 className="plan-name">{plan.name}</h2>
                <p className="plan-tagline">{plan.description}</p>
                <div className="price-container">
                  <span className="currency">$</span>
                  <span className="amount">{plan.price}</span>
                  <span className="frequency">/ month</span>
                </div>
              </div>

              <div className="plan-features-wrapper">
                <div className="features-header">WHAT'S INCLUDED</div>
                <ul className="features-checklist">
                  {plan.features.map((feat, i) => (
                    <li key={i}>
                      <div className="feature-icon-box">
                        <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="feature-text">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="plan-card-footer">
                <button
                  className={`cta-button ${isCurrent ? "active-cta" : isFeatured ? "featured-cta" : "standard-cta"}`}
                  onClick={() => handleSelectPlan(plan.key)}
                  disabled={isCurrent || isSubmitting}
                  id={`select-plan-${plan.key.toLowerCase()}`}
                >
                  {isLoading ? (
                    <span className="loader-spinner"></span>
                  ) : isCurrent ? (
                    "Current Active Plan"
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

      {/* Usage Analytics & Plan Details Dashboard */}
      <div className="usage-dashboard-card">
        <div className="dashboard-header">
          <div>
            <h3>Subscription & Usage Overview</h3>
            <p>Track your real-time announcement views and manage your subscription state.</p>
          </div>
          <div className="shopify-secured-tag">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Billed via Shopify
          </div>
        </div>

        <div className="metrics-grid">
          {/* Views Used Metric */}
          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-title">Monthly View Usage</span>
              <div className="icon-badge blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
            </div>
            <div className="metric-number">{currentViews.toLocaleString()}</div>
            <div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${usagePercent}%` }}></div>
              </div>
              <div className="progress-text">
                <span>{currentViews.toLocaleString()} / {viewLimitDisplay}</span>
                <span className="percent-badge">{usagePercent}%</span>
              </div>
            </div>
          </div>

          {/* Current Tier Metric */}
          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-title">Active Plan Tier</span>
              <div className="icon-badge green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
            </div>
            <div className="metric-number accent">{currentPlan}</div>
            <div className="metric-footer-text">
              {currentPlan === PLAN_FREE ? "Free Tier ($0/mo)" : `$${plans.find((p) => p.key === currentPlan)?.price ?? 0} / month`}
            </div>
          </div>

          {/* Monthly Allowance Metric */}
          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-title">Monthly View Cap</span>
              <div className="icon-badge purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
              </div>
            </div>
            <div className="metric-number">{viewLimitDisplay}</div>
            <div className="metric-footer-text">
              {viewLimit === -1 ? "No view limit restrictions" : "Resets automatically on 1st of month"}
            </div>
          </div>

          {/* Renewal Date & Management */}
          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-title">Next Renewal Date</span>
              <div className="icon-badge orange">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
            </div>
            <div className="metric-date">{formattedRenewalDate}</div>
            {currentPlan !== PLAN_FREE && subscriptionId ? (
              <button
                className="cancel-subscription-btn"
                onClick={handleCancelRenewal}
                disabled={isSubmitting}
                id="cancel-renewal-btn"
              >
                Cancel Renewal
              </button>
            ) : (
              <div className="metric-footer-text">No active auto-renew charge</div>
            )}
          </div>
        </div>
      </div>

      {/* Trust & Guarantee Banner */}
      <div className="trust-footer-banner">
        <div className="trust-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <div>
            <strong>100% Shopify Guarantee</strong>
            <p>All charges are safely processed directly through your official Shopify invoice.</p>
          </div>
        </div>
        <div className="trust-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          <div>
            <strong>Upgrade or Downgrade Anytime</strong>
            <p>Switch plans instantly with prorated Shopify billing calculation.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles – Ultra-modern, premium design system                       */
/* ------------------------------------------------------------------ */
const STYLES = `
  .pricing-wrapper {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px 20px 48px 20px;
    font-family: -apple-system, BlinkMacSystemFont, "San Francisco", "Segoe UI", Roboto, sans-serif;
    color: #0f172a;
    box-sizing: border-box;
  }

  /* Alerts */
  .pricing-alert {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 18px;
    border-radius: 12px;
    margin-bottom: 24px;
    font-size: 14px;
    line-height: 1.5;
  }

  .pricing-alert.error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
  }

  .alert-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .alert-sub {
    opacity: 0.9;
  }

  /* Header Card */
  .pricing-header-card {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    border-radius: 20px;
    padding: 36px 40px;
    color: #ffffff;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 36px;
    box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.15);
    position: relative;
    overflow: hidden;
  }

  .pricing-header-card::after {
    content: "";
    position: absolute;
    top: -50%;
    right: -10%;
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
    pointer-events: none;
  }

  .header-text h1 {
    font-size: 30px;
    font-weight: 800;
    margin: 8px 0;
    letter-spacing: -0.5px;
    color: #ffffff;
  }

  .header-text p {
    font-size: 15px;
    color: #94a3b8;
    margin: 0;
    max-width: 620px;
    line-height: 1.5;
  }

  .header-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 700;
    color: #60a5fa;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .test-mode-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(245, 158, 11, 0.15);
    border: 1px solid rgba(245, 158, 11, 0.4);
    color: #f59e0b;
    border-radius: 30px;
    font-size: 13px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .pulse-dot {
    width: 8px;
    height: 8px;
    background: #f59e0b;
    border-radius: 50%;
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7);
    animation: pulse 1.8s infinite;
  }

  @keyframes pulse {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); }
    70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
  }

  /* Pricing Cards Grid */
  .pricing-cards-container {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 28px;
    margin-bottom: 40px;
  }

  @media (max-width: 980px) {
    .pricing-cards-container {
      grid-template-columns: 1fr;
    }
    .pricing-header-card {
      flex-direction: column;
      align-items: flex-start;
      gap: 20px;
      padding: 28px;
    }
  }

  /* Card */
  .plan-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    padding: 32px 28px;
    display: flex;
    flex-direction: column;
    position: relative;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.03);
  }

  .plan-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 28px -4px rgba(15, 23, 42, 0.08);
  }

  /* Featured / Most Popular Card */
  .plan-card.featured-card {
    border: 2px solid #2563eb;
    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  }

  /* Active Card */
  .plan-card.active-card {
    border: 2px solid #10b981;
    background: #fafdfb;
  }

  /* Ribbons */
  .ribbon-popular {
    position: absolute;
    top: -14px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    color: #ffffff;
    font-size: 11px;
    font-weight: 800;
    padding: 5px 16px;
    border-radius: 20px;
    letter-spacing: 0.8px;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
  }

  .ribbon-current {
    position: absolute;
    top: -14px;
    right: 24px;
    background: #10b981;
    color: #ffffff;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 12px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    gap: 4px;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
  }

  .plan-card-header {
    padding-bottom: 24px;
    border-bottom: 1px solid #f1f5f9;
    margin-bottom: 24px;
  }

  .plan-name {
    font-size: 22px;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 6px 0;
  }

  .plan-tagline {
    font-size: 13.5px;
    color: #64748b;
    margin: 0 0 20px 0;
    min-height: 40px;
    line-height: 1.45;
  }

  .price-container {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }

  .price-container .currency {
    font-size: 24px;
    font-weight: 700;
    color: #0f172a;
  }

  .price-container .amount {
    font-size: 44px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -1px;
    line-height: 1;
  }

  .price-container .frequency {
    font-size: 14px;
    font-weight: 500;
    color: #64748b;
    margin-left: 2px;
  }

  /* Features List */
  .plan-features-wrapper {
    flex: 1;
    margin-bottom: 28px;
  }

  .features-header {
    font-size: 11px;
    font-weight: 800;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 16px;
  }

  .features-checklist {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .features-checklist li {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    font-size: 14px;
    color: #334155;
    margin-bottom: 12px;
    line-height: 1.4;
  }

  .feature-icon-box {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #dcfce7;
    color: #16a34a;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .feature-text {
    font-weight: 500;
  }

  /* CTA Buttons */
  .plan-card-footer {
    margin-top: auto;
  }

  .cta-button {
    width: 100%;
    padding: 14px 20px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #0f172a;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 48px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .cta-button:hover:not(:disabled) {
    background: #f8fafc;
    border-color: #94a3b8;
  }

  .featured-cta {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: #ffffff;
    border-color: #0f172a;
  }

  .featured-cta:hover:not(:disabled) {
    background: #334155;
    border-color: #334155;
    transform: scale(1.01);
  }

  .active-cta {
    background: #ecfdf5;
    color: #059669;
    border-color: #a7f3d0;
    cursor: default;
  }

  .cta-button:disabled {
    opacity: 0.85;
  }

  .loader-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Dashboard Card */
  .usage-dashboard-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    padding: 32px;
    box-shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.03);
    margin-bottom: 28px;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;
    padding-bottom: 20px;
    border-bottom: 1px solid #f1f5f9;
  }

  .dashboard-header h3 {
    font-size: 20px;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 4px 0;
  }

  .dashboard-header p {
    font-size: 14px;
    color: #64748b;
    margin: 0;
  }

  .shopify-secured-tag {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: #475569;
    background: #f1f5f9;
    padding: 6px 14px;
    border-radius: 20px;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
  }

  @media (max-width: 900px) {
    .metrics-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 520px) {
    .metrics-grid {
      grid-template-columns: 1fr;
    }
  }

  .metric-card {
    background: #f8fafc;
    border: 1px solid #f1f5f9;
    border-radius: 16px;
    padding: 20px;
    display: flex;
    flex-direction: column;
  }

  .metric-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .metric-title {
    font-size: 12.5px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .icon-badge {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-badge.blue { background: #dbeafe; color: #2563eb; }
  .icon-badge.green { background: #dcfce7; color: #16a34a; }
  .icon-badge.purple { background: #f3e8ff; color: #9333ea; }
  .icon-badge.orange { background: #ffedd5; color: #ea580c; }

  .metric-number {
    font-size: 28px;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 12px;
    letter-spacing: -0.5px;
  }

  .metric-number.accent {
    color: #10b981;
  }

  .metric-date {
    font-size: 18px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 12px;
  }

  .progress-container {
    margin-top: auto;
  }

  .progress-bar {
    height: 8px;
    background: #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #10b981 0%, #059669 100%);
    border-radius: 4px;
    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .progress-text {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: #64748b;
    font-weight: 500;
  }

  .percent-badge {
    font-weight: 700;
    color: #059669;
    background: #dcfce7;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .metric-footer-text {
    font-size: 12.5px;
    color: #64748b;
    margin-top: auto;
    font-weight: 500;
  }

  .cancel-subscription-btn {
    margin-top: auto;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    border: 1px solid #fecaca;
    background: #ffffff;
    color: #dc2626;
    transition: all 0.2s ease;
    width: 100%;
  }

  .cancel-subscription-btn:hover:not(:disabled) {
    background: #fef2f2;
    border-color: #fca5a5;
  }

  /* Trust Footer */
  .trust-footer-banner {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }

  @media (max-width: 768px) {
    .trust-footer-banner {
      grid-template-columns: 1fr;
    }
  }

  .trust-item {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 20px 24px;
    display: flex;
    align-items: flex-start;
    gap: 16px;
    color: #475569;
  }

  .trust-item svg {
    color: #2563eb;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .trust-item strong {
    display: block;
    font-size: 14px;
    color: #0f172a;
    margin-bottom: 2px;
  }

  .trust-item p {
    font-size: 13px;
    margin: 0;
    color: #64748b;
    line-height: 1.4;
  }
`;
