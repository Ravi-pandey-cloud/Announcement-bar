import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useSubmit, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/* ------------------------------------------------------------------ */
/*  Plan Constants & Configuration                                     */
/* ------------------------------------------------------------------ */
const PLAN_FREE = "Free";
const PLAN_PREMIUM = "Premium";
const PLAN_UNLIMITED = "Unlimited";

interface PlanConfig {
  key: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  viewLimit: number;
  highlight: boolean;
  badge?: string;
  features: string[];
}

const PLANS: PlanConfig[] = [
  {
    key: PLAN_FREE,
    name: "Free Starter",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Perfect for testing and small stores starting out",
    viewLimit: 2000,
    highlight: false,
    features: [
      "Up to 2,000 views / month",
      "1 Active Announcement Bar",
      "Standard Customization & Colors",
      "Page & Country Targeting",
      "Community Support",
    ],
  },
  {
    key: PLAN_PREMIUM,
    name: "Premium Pro",
    monthlyPrice: 9,
    annualPrice: 7,
    description: "Ideal for growing stores needing advanced sales boosters",
    viewLimit: 50000,
    highlight: true,
    badge: "Most Popular",
    features: [
      "Up to 50,000 views / month",
      "Unlimited Active Announcements",
      "Countdown Sale Timers",
      "Cart Goal Free Shipping Bar",
      "Multiple Bar Rotation (Carousel & Marquee)",
      "Priority Email & Chat Support",
    ],
  },
  {
    key: PLAN_UNLIMITED,
    name: "Unlimited Scale",
    monthlyPrice: 29,
    annualPrice: 23,
    description: "Built for high-volume brands with maximum traffic",
    viewLimit: Infinity,
    highlight: false,
    badge: "Maximum Power",
    features: [
      "Unlimited Monthly Views",
      "Unlimited Active Announcements",
      "All Premium Features Included",
      "Custom CSS & Custom JS Injection",
      "Advanced Customer Tag Targeting",
      "Dedicated 1-on-1 Account Manager",
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Loader – query subscriptions safely with Response pass-through   */
/* ------------------------------------------------------------------ */
export async function loader({ request }: LoaderFunctionArgs) {
  let adminContext;
  try {
    adminContext = await authenticate.admin(request);
  } catch (err) {
    if (err instanceof Response) throw err;
    throw err;
  }

  const { billing, session } = adminContext;
  const isTestMode = process.env.SHOPIFY_TEST_MODE === "true";

  let currentPlan = PLAN_FREE;
  let subscriptionId: string | null = null;
  let renewalDate: string | null = null;

  // 1. Query Shopify active subscriptions with response re-throw protection
  try {
    const billingResult = await billing.check({
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
    if (err instanceof Response) throw err;
    console.error("[Pricing Loader] Billing check warning:", err);
  }

  // 2. Query monthly analytics views safely
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
    console.error("[Pricing Loader] Analytics query warning:", err);
  }

  // 3. Determine current plan's view limit
  const planMeta = PLANS.find((p) => p.key === currentPlan);
  const viewLimit = planMeta?.viewLimit ?? 2000;

  // 4. Default estimated renewal date if none returned from Shopify API
  if (!renewalDate) {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    renewalDate = nextMonth.toISOString().split("T")[0];
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
/*  Action – handle plan selection & subscription cancellation       */
/* ------------------------------------------------------------------ */
export async function action({ request }: ActionFunctionArgs) {
  let adminContext;
  try {
    adminContext = await authenticate.admin(request);
  } catch (err) {
    if (err instanceof Response) throw err;
    throw err;
  }

  const { billing } = adminContext;
  const formData = await request.formData();
  const intent = formData.get("intent");
  const isTestMode = process.env.SHOPIFY_TEST_MODE === "true";

  if (intent === "selectPlan") {
    const plan = String(formData.get("plan"));

    if (plan === PLAN_FREE) {
      try {
        const billingCheck = await billing.check({
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
        if (err instanceof Response) throw err;
        console.error("[Pricing Action] Subscription cancel error:", err);
      }
      return { ok: true, plan: PLAN_FREE };
    }

    // For Premium or Unlimited, request billing redirect (throws a Response redirect)
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
        if (err instanceof Response) throw err;
        console.error("[Pricing Action] Renewal cancel error:", err);
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
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<string | null>("faq-1");

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
    if (confirm("Are you sure you want to cancel your plan renewal? You will be downgraded to Free at the end of your billing cycle.")) {
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

  const formattedRenewalDate = renewalDate
    ? new Date(renewalDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  const faqs = [
    {
      id: "faq-1",
      question: "Can I upgrade or downgrade my plan at any time?",
      answer: "Yes! You can switch between Free, Premium, and Unlimited plans anytime. When upgrading, Shopify handles the prorated charge automatically. When downgrading, your active plan remains until the end of your billing period.",
    },
    {
      id: "faq-2",
      question: "How are monthly announcement views calculated?",
      answer: "A view is counted whenever an active announcement bar is loaded and displayed on a customer's browser. Views reset automatically on the 1st of every month.",
    },
    {
      id: "faq-3",
      question: "What happens if I reach my plan's monthly view limit?",
      answer: "Your announcement bars will continue displaying uninterrupted for a grace buffer. You will receive an admin notification suggesting an upgrade to Premium or Unlimited to keep your bars active.",
    },
    {
      id: "faq-4",
      question: "Will I be charged real money during test mode?",
      answer: "No! Test mode is currently enabled (SHOPIFY_TEST_MODE=true). All plan changes trigger Shopify sandbox test subscriptions, allowing you to test the full billing flow safely without any real charges.",
    },
  ];

  return (
    <div className="pricing-root">
      {/* Import modern typography */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
      />
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* Hero Header */}
      <div className="pricing-hero">
        <div className="pricing-hero-badge-row">
          <span className="hero-pill-tag">Flexible Plans</span>
          {isTestMode && (
            <span className="test-badge">
              <span className="test-badge-pulse"></span>
              SHOPIFY BILLING TEST MODE
            </span>
          )}
        </div>
        <h1 className="pricing-hero-title">
          Simple, Transparent Pricing for Every Store
        </h1>
        <p className="pricing-hero-subtitle">
          Boost sales and drive conversions with powerful announcement bars. Upgrade or downgrade anytime with 1-click.
        </p>

        {/* Billing Cycle Switch */}
        <div className="billing-switch-container">
          <span className={`switch-label ${!isAnnual ? "active" : ""}`}>
            Monthly Billing
          </span>
          <button
            className={`billing-switch-toggle ${isAnnual ? "checked" : ""}`}
            onClick={() => setIsAnnual(!isAnnual)}
            type="button"
            aria-label="Toggle Billing Cycle"
          >
            <span className="switch-thumb" />
          </button>
          <span className={`switch-label ${isAnnual ? "active" : ""}`}>
            Annual Billing
            <span className="save-badge">Save 20%</span>
          </span>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="plans-grid">
        {plans.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          const isLoading = isSubmitting && pendingPlan === plan.key;
          const displayPrice = isAnnual ? plan.annualPrice : plan.monthlyPrice;

          return (
            <div
              key={plan.key}
              className={`plan-card ${plan.highlight ? "highlighted" : ""} ${isCurrent ? "current" : ""}`}
            >
              {plan.badge && !isCurrent && (
                <div className="card-badge">{plan.badge}</div>
              )}
              {isCurrent && (
                <div className="card-badge current-badge">
                  <span className="status-dot"></span> Active Plan
                </div>
              )}

              <div className="plan-header">
                <h3 className="plan-title">{plan.name}</h3>
                <p className="plan-desc">{plan.description}</p>
                <div className="price-container">
                  <span className="price-currency">$</span>
                  <span className="price-val">{displayPrice}</span>
                  <span className="price-period">/ month</span>
                </div>
                {isAnnual && plan.monthlyPrice > 0 && (
                  <div className="annual-note">
                    Billed annually (${displayPrice * 12}/year)
                  </div>
                )}
              </div>

              <div className="divider" />

              <div className="features-list">
                <div className="features-label">WHAT'S INCLUDED</div>
                {plan.features.map((feat, idx) => (
                  <div key={idx} className="feature-row">
                    <div className="check-icon-wrapper">
                      <svg viewBox="0 0 20 20" fill="none" className="check-svg">
                        <path
                          d="M16.666 5L7.5 14.166 3.333 10"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <button
                className={`plan-cta-btn ${plan.highlight ? "btn-primary" : "btn-secondary"} ${isCurrent ? "btn-current" : ""}`}
                onClick={() => handleSelectPlan(plan.key)}
                disabled={isCurrent || isSubmitting}
                id={`select-plan-${plan.key.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {isLoading ? (
                  <span className="spinner"></span>
                ) : isCurrent ? (
                  "Current Active Plan"
                ) : currentPlan !== PLAN_FREE && plan.key === PLAN_FREE ? (
                  "Downgrade to Free"
                ) : (
                  `Choose ${plan.name}`
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Usage Analytics Section */}
      <div className="usage-dashboard">
        <div className="dashboard-header">
          <div>
            <h2 className="dashboard-title">Current Plan Usage & Subscription</h2>
            <p className="dashboard-subtitle">
              Real-time monitoring of your storefront impression metrics and plan limits
            </p>
          </div>
          <span className="active-plan-pill">
            <span className="pulse-dot"></span>
            Current: {currentPlan}
          </span>
        </div>

        <div className="usage-grid">
          {/* Stat 1: Monthly Views */}
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Views This Month</span>
              <span className="stat-icon">👁️</span>
            </div>
            <div className="stat-value">{currentViews.toLocaleString()}</div>
            <div className="progress-container">
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <div className="progress-text">
                <span>{usagePercent}% Used</span>
                <span>{viewLimitDisplay} Limit</span>
              </div>
            </div>
          </div>

          {/* Stat 2: Active Plan */}
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Subscription Tier</span>
              <span className="stat-icon">💎</span>
            </div>
            <div className="stat-value">{currentPlan}</div>
            <div className="stat-meta">
              {currentPlan === PLAN_FREE
                ? "Standard Free Tier ($0/mo)"
                : `$${plans.find((p) => p.key === currentPlan)?.monthlyPrice ?? 0}/month subscription`}
            </div>
          </div>

          {/* Stat 3: View Limit */}
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Monthly View Limit</span>
              <span className="stat-icon">⚡</span>
            </div>
            <div className="stat-value">{viewLimitDisplay}</div>
            <div className="stat-meta">
              {viewLimit === -1 ? "Unlimited impressions allowance" : "Resets on 1st of next month"}
            </div>
          </div>

          {/* Stat 4: Renewal Date */}
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Next Renewal Date</span>
              <span className="stat-icon">📅</span>
            </div>
            <div className="stat-value-sm">{formattedRenewalDate}</div>
            {currentPlan !== PLAN_FREE && subscriptionId && (
              <button
                className="cancel-btn"
                onClick={handleCancelRenewal}
                disabled={isSubmitting}
                id="cancel-renewal-btn"
              >
                Cancel Subscription Renewal
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="faq-dashboard">
        <h2 className="faq-title">Frequently Asked Questions</h2>
        <div className="faq-grid">
          {faqs.map((faq) => {
            const isOpen = openFaq === faq.id;
            return (
              <div
                key={faq.id}
                className={`faq-card ${isOpen ? "open" : ""}`}
                onClick={() => setOpenFaq(isOpen ? null : faq.id)}
              >
                <div className="faq-question">
                  <span>{faq.question}</span>
                  <span className="faq-chevron">{isOpen ? "−" : "+"}</span>
                </div>
                {isOpen && <div className="faq-answer">{faq.answer}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CSS Styling (Vanilla CSS with Premium Dark/Light Aesthetic)        */
/* ------------------------------------------------------------------ */
const STYLES = `
  .pricing-root {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: #f8fafc;
    color: #0f172a;
    min-height: 100vh;
    padding: 40px 24px;
    max-width: 1240px;
    margin: 0 auto;
    box-sizing: border-box;
  }

  /* Hero Section */
  .pricing-hero {
    text-align: center;
    max-width: 760px;
    margin: 0 auto 48px auto;
  }

  .pricing-hero-badge-row {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .hero-pill-tag {
    background: #e2e8f0;
    color: #475569;
    font-size: 12px;
    font-weight: 700;
    padding: 4px 12px;
    border-radius: 20px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .test-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fde68a;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 12px;
    border-radius: 20px;
    letter-spacing: 0.3px;
  }

  .test-badge-pulse {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #d97706;
    animation: pulse 1.8s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(1.2); }
  }

  .pricing-hero-title {
    font-size: 36px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.2;
    margin: 0 0 16px 0;
    letter-spacing: -0.8px;
  }

  .pricing-hero-subtitle {
    font-size: 16px;
    color: #64748b;
    margin: 0 0 32px 0;
    line-height: 1.6;
  }

  /* Billing Toggle Switch */
  .billing-switch-container {
    display: inline-flex;
    align-items: center;
    gap: 14px;
    background: #ffffff;
    padding: 8px 18px;
    border-radius: 40px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
  }

  .switch-label {
    font-size: 14px;
    font-weight: 600;
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: color 0.2s;
  }

  .switch-label.active {
    color: #0f172a;
  }

  .save-badge {
    background: #dcfce7;
    color: #15803d;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 12px;
  }

  .billing-switch-toggle {
    width: 48px;
    height: 26px;
    background: #cbd5e1;
    border-radius: 13px;
    border: none;
    cursor: pointer;
    position: relative;
    padding: 3px;
    transition: background-color 0.25s ease;
  }

  .billing-switch-toggle.checked {
    background: #0f172a;
  }

  .switch-thumb {
    width: 20px;
    height: 20px;
    background: #ffffff;
    border-radius: 50%;
    display: block;
    transition: transform 0.25s ease;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }

  .billing-switch-toggle.checked .switch-thumb {
    transform: translateX(22px);
  }

  /* Plans Grid */
  .plans-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 28px;
    margin-bottom: 48px;
    align-items: stretch;
  }

  @media (max-width: 960px) {
    .plans-grid {
      grid-template-columns: 1fr;
      max-width: 480px;
      margin-left: auto;
      margin-right: auto;
    }
  }

  /* Plan Card */
  .plan-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    padding: 32px 28px;
    display: flex;
    flex-direction: column;
    position: relative;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  }

  .plan-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
  }

  .plan-card.highlighted {
    border: 2px solid #0f172a;
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
  }

  .plan-card.current {
    border: 2px solid #16a34a;
  }

  /* Card Badges */
  .card-badge {
    position: absolute;
    top: -14px;
    left: 50%;
    transform: translateX(-50%);
    background: #0f172a;
    color: #ffffff;
    font-size: 11px;
    font-weight: 800;
    padding: 4px 16px;
    border-radius: 20px;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .card-badge.current-badge {
    background: #16a34a;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    background: #ffffff;
    border-radius: 50%;
  }

  /* Plan Card Header */
  .plan-header {
    text-align: left;
    margin-bottom: 24px;
  }

  .plan-title {
    font-size: 22px;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 6px 0;
  }

  .plan-desc {
    font-size: 13.5px;
    color: #64748b;
    margin: 0 0 20px 0;
    line-height: 1.4;
    min-height: 38px;
  }

  .price-container {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }

  .price-currency {
    font-size: 24px;
    font-weight: 800;
    color: #0f172a;
  }

  .price-val {
    font-size: 46px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -1.5px;
    line-height: 1;
  }

  .price-period {
    font-size: 14px;
    color: #64748b;
    font-weight: 600;
  }

  .annual-note {
    font-size: 12px;
    color: #16a34a;
    font-weight: 600;
    margin-top: 6px;
  }

  .divider {
    height: 1px;
    background: #f1f5f9;
    margin-bottom: 24px;
  }

  /* Features List */
  .features-list {
    flex: 1;
    margin-bottom: 32px;
  }

  .features-label {
    font-size: 11px;
    font-weight: 800;
    color: #94a3b8;
    letter-spacing: 0.8px;
    margin-bottom: 16px;
  }

  .feature-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
    font-size: 14px;
    color: #334155;
    line-height: 1.4;
  }

  .check-icon-wrapper {
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

  .check-svg {
    width: 12px;
    height: 12px;
  }

  /* CTA Buttons */
  .plan-cta-btn {
    width: 100%;
    padding: 14px 20px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: none;
    box-sizing: border-box;
  }

  .btn-primary {
    background: #0f172a;
    color: #ffffff;
  }

  .btn-primary:hover:not(:disabled) {
    background: #1e293b;
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.25);
  }

  .btn-secondary {
    background: #f1f5f9;
    color: #0f172a;
    border: 1px solid #cbd5e1;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #e2e8f0;
  }

  .btn-current {
    background: #f0fdf4;
    color: #16a34a;
    border: 1px solid #bbf7d0;
    cursor: default;
  }

  .plan-cta-btn:disabled {
    opacity: 0.85;
    cursor: not-allowed;
  }

  /* Spinner */
  .spinner {
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

  /* Usage Dashboard */
  .usage-dashboard {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    padding: 32px;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.03);
    margin-bottom: 48px;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 28px;
    flex-wrap: wrap;
    gap: 16px;
  }

  .dashboard-title {
    font-size: 20px;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 4px 0;
  }

  .dashboard-subtitle {
    font-size: 14px;
    color: #64748b;
    margin: 0;
  }

  .active-plan-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #f1f5f9;
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
  }

  .pulse-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #16a34a;
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

  @media (max-width: 540px) {
    .usage-grid {
      grid-template-columns: 1fr;
    }
  }

  .stat-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 20px;
    display: flex;
    flex-direction: column;
  }

  .stat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .stat-label {
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
  }

  .stat-icon {
    font-size: 18px;
  }

  .stat-value {
    font-size: 26px;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 12px;
  }

  .stat-value-sm {
    font-size: 17px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 12px;
  }

  .stat-meta {
    font-size: 12px;
    color: #94a3b8;
    margin-top: auto;
  }

  /* Progress Bar */
  .progress-container {
    margin-top: auto;
  }

  .progress-bar-bg {
    width: 100%;
    height: 8px;
    background: #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 6px;
  }

  .progress-bar-fill {
    height: 100%;
    background: #0f172a;
    border-radius: 4px;
    transition: width 0.4s ease;
  }

  .progress-text {
    display: flex;
    justify-content: space-between;
    font-size: 11.5px;
    color: #64748b;
    font-weight: 600;
  }

  .cancel-btn {
    margin-top: auto;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    background: #ffffff;
    color: #dc2626;
    border: 1px solid #fca5a5;
    transition: all 0.2s ease;
    width: 100%;
  }

  .cancel-btn:hover:not(:disabled) {
    background: #fef2f2;
    border-color: #f87171;
  }

  /* FAQ Section */
  .faq-dashboard {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    padding: 32px;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.03);
  }

  .faq-title {
    font-size: 20px;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 24px 0;
  }

  .faq-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .faq-card {
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 18px 20px;
    cursor: pointer;
    transition: border-color 0.2s ease, background-color 0.2s ease;
  }

  .faq-card:hover {
    background-color: #f8fafc;
  }

  .faq-card.open {
    border-color: #0f172a;
    background-color: #f8fafc;
  }

  .faq-question {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
  }

  .faq-chevron {
    font-size: 18px;
    color: #64748b;
    font-weight: 700;
  }

  .faq-answer {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
    font-size: 14px;
    color: #475569;
    line-height: 1.6;
  }
`;
