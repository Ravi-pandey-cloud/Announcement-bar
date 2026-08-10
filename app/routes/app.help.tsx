import { useState, useMemo } from "react";

interface FAQItem {
  id: string;
  category: "getting-started" | "targeting" | "display" | "troubleshooting";
  question: string;
  answer: string;
}

interface FeatureGuide {
  id: string;
  title: string;
  icon: string;
  tag: string;
  summary: string;
  details: string[];
}

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState<"getting-started" | "features" | "faq" | "architecture">("getting-started");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<string | null>("faq-1");

  // FAQ dataset compiled from app overview documentation
  const faqs: FAQItem[] = [
    {
      id: "faq-1",
      category: "troubleshooting",
      question: "Why is my announcement bar not appearing on my live storefront?",
      answer: `Check the following 4 common reasons:
1. Theme Block Installation: Confirm you added the Announcement Bar App Block in your theme (Online Store → Themes → Customize → Add section → Apps → Announcement bar). The bar will only render where the block is explicitly placed.
2. Enabled Status: Verify the bar is enabled in the app dashboard.
3. Scheduling & Targeting: Check if start/end times or page/location targeting rules exclude your current page or location.
4. App Proxy Verification: Open browser dev tools (F12) → Network tab, search for '/apps/announcement-bar/bars', and confirm it returns a 200 OK status code with your bar payload.`
    },
    {
      id: "faq-2",
      category: "display",
      question: "How does rotation work when multiple active bars target the same page?",
      answer: "When more than one active announcement bar targets a page, they combine into a single rotating widget. You can set the rotation mode to Static (displays primary bar), Carousel (fades/slides between bars every few seconds), or Scrolling Text (continuous marquee animation). The order of rotation matches the sequence arranged on your dashboard."
    },
    {
      id: "faq-3",
      category: "targeting",
      question: "How does the Cart Goal progress bar update live?",
      answer: "The Cart Goal progress bar connects directly to Shopify's Storefront /cart.js AJAX endpoint. As shoppers add, remove, or adjust quantities in their cart, the bar automatically recalculates the remaining amount needed to reach your custom threshold (e.g. Free Shipping) without requiring page reloads."
    },
    {
      id: "faq-4",
      category: "targeting",
      question: "How is the shopper's location detected for country targeting?",
      answer: "Country targeting leverages Shopify's native storefront localization context (detected from the shopper's browser and currency/country selector). If a bar is restricted to specific countries, it will only be delivered to shoppers located in or viewing that market."
    },
    {
      id: "faq-5",
      category: "getting-started",
      question: "What happens when a shopper clicks the dismiss ('×') button?",
      answer: "When a shopper closes an announcement bar by clicking the '×' button, the dismissal is stored in their browser session. The bar remains hidden for the rest of their visit so it doesn't disrupt their shopping experience on subsequent page views."
    },
    {
      id: "faq-6",
      category: "display",
      question: "How do countdown timers handle flash sales when time runs out?",
      answer: "Countdown timers update live second-by-second on the storefront. Once the timer reaches zero, if you configured a replacement message (e.g. 'Sale has ended'), it will immediately swap to that message. If no replacement message was set, the bar automatically hides itself."
    }
  ];

  // Feature Guides compiled from app overview documentation
  const featureGuides: FeatureGuide[] = [
    {
      id: "feat-dashboard",
      title: "1. Announcement Management Dashboard",
      icon: "📊",
      tag: "Admin Management",
      summary: "Central hub in Shopify Admin to create, edit, duplicate, reorder, and toggle announcement bars.",
      details: [
        "Create, edit, duplicate, and delete announcement bars effortlessly.",
        "Enable or disable any bar instantly with a single toggle switch.",
        "Reorder bars with drag-and-drop or reorder controls to adjust rotation priority.",
        "At-a-glance status indicators: Active, Scheduled, Draft, and Expired badges.",
        "Live interactive preview of message, buttons, countdowns, and colors during editing."
      ]
    },
    {
      id: "feat-targeting",
      title: "2. Page & Audience Targeting",
      icon: "🎯",
      tag: "Rule Engine",
      summary: "Show targeted promotions based on page type or shopper geographical location.",
      details: [
        "Page Targeting: Display on Home page, Collection pages, Product pages, Cart page, or any specific Custom Page URL.",
        "Location Targeting: Show to all shoppers globally or restrict to specific countries via storefront localization.",
        "Run region-specific shipping promotions or cart-page-only notices."
      ]
    },
    {
      id: "feat-scheduling",
      title: "3. Campaign Scheduling",
      icon: "⏰",
      tag: "Automation",
      summary: "Automate start and end times for sales, holidays, and timed promotional campaigns.",
      details: [
        "Set optional Start Date/Time and End Date/Time for each bar.",
        "Automatic state transitions: Scheduled → Active → Expired.",
        "No manual toggling required — bars turn on and off automatically at precise times."
      ]
    },
    {
      id: "feat-countdown",
      title: "4. Countdown Timers",
      icon: "⏳",
      tag: "Flash Sales",
      summary: "Drive urgency for flash sales and limited-time offers with live second-by-second timers.",
      details: [
        "Attach a live countdown timer bound to any bar's scheduled end time.",
        "Custom expired-state message (e.g., switch from 'Sale ends in...' to 'Sale has ended').",
        "Auto-disappear option if no replacement message is configured."
      ]
    },
    {
      id: "feat-rotation",
      title: "5. Multiple Bars & Rotation",
      icon: "🔄",
      tag: "Display Styles",
      summary: "Combine multiple active announcements and cycle them seamlessly on your store.",
      details: [
        "Static: Display a single standalone announcement bar.",
        "Carousel: Smoothly fade or slide between multiple active bars every few seconds.",
        "Scrolling Text: Continuous marquee-style ticker for high-visibility notices."
      ]
    },
    {
      id: "feat-cart-goal",
      title: "6. Cart Goal Progress Bar",
      icon: "🛒",
      tag: "Conversion Booster",
      summary: "Dynamic 'Spend $X more for Free Shipping' progress bar driven by live cart total.",
      details: [
        "Motivates shoppers to add more items to reach threshold goals.",
        "Customizable in-progress text with `{amount}` variable insertion.",
        "Customizable goal-achieved message upon reaching the threshold.",
        "Listens to Shopify /cart.js AJAX calls for real-time recalculations."
      ]
    },
    {
      id: "feat-styling",
      title: "7. Custom Styling & Placement",
      icon: "🎨",
      tag: "Branding",
      summary: "Fully customizable styling matching your brand design without touching Liquid code.",
      details: [
        "Custom background colors, gradients, border radius, and text colors per bar.",
        "Optional Call-To-Action (CTA) button with custom label and link destination.",
        "Dismissible ('×') button with session memory to prevent repeated popups.",
        "Top or bottom position and sticky/scroll behavior set via Theme Editor settings."
      ]
    }
  ];

  // Filtered lists based on search input
  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;
    const q = searchQuery.toLowerCase();
    return faqs.filter(
      (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
    );
  }, [searchQuery, faqs]);

  const filteredFeatures = useMemo(() => {
    if (!searchQuery.trim()) return featureGuides;
    const q = searchQuery.toLowerCase();
    return featureGuides.filter(
      (f) =>
        f.title.toLowerCase().includes(q) ||
        f.summary.toLowerCase().includes(q) ||
        f.details.some((d) => d.toLowerCase().includes(q))
    );
  }, [searchQuery, featureGuides]);

  return (
    <div className="help-wrapper">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .help-wrapper {
          padding: 32px;
          margin: 20px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #202223;
          background-color: #f6f6f7;
          min-height: 100vh;
        }

        .help-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .header-title-section h1 {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 6px 0;
          color: #202223;
        }

        .header-title-section p {
          font-size: 14px;
          color: #6d7175;
          margin: 0;
        }

        /* Search Bar */
        .help-search-box {
          position: relative;
          margin-bottom: 24px;
        }

        .help-search-input {
          width: 100%;
          padding: 12px 18px 12px 46px;
          border: 1px solid #c9cccf;
          border-radius: 10px;
          font-size: 15px;
          outline: none;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }

        .help-search-input:focus {
          border-color: #1a1a1a;
          box-shadow: 0 0 0 2px rgba(26,26,26,0.1);
        }

        .help-search-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #6d7175;
          font-size: 18px;
          pointer-events: none;
        }

        /* Tabs Navigation */
        .nav-tabs {
          display: flex;
          gap: 8px;
          border-bottom: 1px solid #e3e3e3;
          margin-bottom: 24px;
        }

        .tab-btn {
          padding: 12px 20px;
          font-size: 14px;
          font-weight: 600;
          color: #6d7175;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: color 0.15s, border-color 0.15s;
        }

        .tab-btn:hover {
          color: #202223;
        }

        .tab-btn.active {
          color: #1a1a1a;
          border-bottom-color: #1a1a1a;
        }

        .tab-badge {
          background-color: #e4e5e7;
          color: #202223;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
        }

        /* Content Cards */
        .card-panel {
          background: #ffffff;
          border: 1px solid #e3e3e3;
          border-radius: 12px;
          padding: 28px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          margin-bottom: 24px;
        }

        .panel-title {
          font-size: 20px;
          font-weight: 700;
          color: #202223;
          margin: 0 0 12px 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .panel-subtitle {
          font-size: 14px;
          color: #6d7175;
          margin: 0 0 20px 0;
          line-height: 1.5;
        }

        /* Step List */
        .step-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .step-item {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          padding: 16px;
          background: #f9fafb;
          border: 1px solid #ebebeb;
          border-radius: 10px;
        }

        .step-number {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #1a1a1a;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 15px;
          flex-shrink: 0;
        }

        .step-content h4 {
          margin: 0 0 6px 0;
          font-size: 15px;
          font-weight: 600;
          color: #202223;
        }

        .step-content p {
          margin: 0;
          font-size: 14px;
          color: #6d7175;
          line-height: 1.5;
        }

        .callout-box {
          background-color: #f0f7ff;
          border-left: 4px solid #0066cc;
          padding: 16px 20px;
          border-radius: 6px;
          margin-top: 20px;
          font-size: 14px;
          color: #004085;
          line-height: 1.5;
        }

        /* Feature Cards Grid */
        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        .feature-card {
          background: #ffffff;
          border: 1px solid #e3e3e3;
          border-radius: 12px;
          padding: 20px;
          transition: transform 0.15s, box-shadow 0.15s;
        }

        .feature-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        }

        .feature-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .feature-card-title {
          font-size: 16px;
          font-weight: 700;
          color: #202223;
          margin: 0;
        }

        .feature-tag {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 6px;
          background: #f1f2f3;
          color: #5c5f62;
        }

        .feature-summary {
          font-size: 13px;
          color: #6d7175;
          margin-bottom: 14px;
          line-height: 1.4;
        }

        .feature-details-list {
          margin: 0;
          padding-left: 18px;
          font-size: 13px;
          color: #202223;
          line-height: 1.6;
        }

        /* FAQ Accordion */
        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .faq-item {
          border: 1px solid #e3e3e3;
          border-radius: 10px;
          overflow: hidden;
          background: #ffffff;
          transition: border-color 0.2s;
        }

        .faq-item.open {
          border-color: #1a1a1a;
        }

        .faq-question-btn {
          width: 100%;
          padding: 16px 20px;
          text-align: left;
          background: none;
          border: none;
          font-size: 15px;
          font-weight: 600;
          color: #202223;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .faq-question-btn:hover {
          background-color: #fafafa;
        }

        .faq-chevron {
          font-size: 16px;
          transition: transform 0.2s;
          color: #6d7175;
        }

        .faq-item.open .faq-chevron {
          transform: rotate(180deg);
        }

        .faq-answer {
          padding: 0 20px 20px 20px;
          font-size: 14px;
          color: #4a4d51;
          line-height: 1.6;
          white-space: pre-line;
          border-top: 1px solid #f1f1f1;
          margin-top: 4px;
          padding-top: 16px;
        }

        /* Tech Architecture Table & Workflow */
        .tech-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 16px;
        }

        .tech-table th, .tech-table td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid #e3e3e3;
          font-size: 14px;
        }

        .tech-table th {
          background-color: #f9fafb;
          font-weight: 600;
          color: #6d7175;
        }

        .tech-badge {
          font-family: monospace;
          background: #f1f2f3;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 13px;
        }

        .workflow-steps {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-top: 16px;
        }

        .workflow-card {
          background: #f9fafb;
          border: 1px solid #e3e3e3;
          border-radius: 10px;
          padding: 16px;
        }

        .workflow-card h5 {
          margin: 0 0 8px 0;
          font-size: 14px;
          font-weight: 700;
          color: #1a1a1a;
        }

        .workflow-card p {
          margin: 0;
          font-size: 13px;
          color: #6d7175;
          line-height: 1.4;
        }

        /* Contact Support Footer */
        .support-card {
          background: #ffffff;
          border: 1px solid #e3e3e3;
          border-radius: 12px;
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }

        .support-info h3 {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 700;
        }

        .support-info p {
          margin: 0;
          font-size: 14px;
          color: #6d7175;
        }

        .btn-support {
          background-color: #1a1a1a;
          color: #ffffff;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: background-color 0.2s;
        }

        .btn-support:hover {
          background-color: #333333;
        }
      `,
        }}
      />

      {/* Header */}
      <div className="help-header">
        <div className="header-title-section">
          <h1>Help & Documentation</h1>
          <p>
            Everything you need to set up, manage, target, and troubleshoot your Announcement Bars.
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="help-search-box">
        <span className="help-search-icon">🔍</span>
        <input
          type="text"
          className="help-search-input"
          placeholder="Search setup guides, feature documentation, or FAQs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Navigation Tabs */}
      <div className="nav-tabs">
        <button
          className={`tab-btn ${activeTab === "getting-started" ? "active" : ""}`}
          onClick={() => setActiveTab("getting-started")}
        >
          🚀 Getting Started
        </button>
        <button
          className={`tab-btn ${activeTab === "features" ? "active" : ""}`}
          onClick={() => setActiveTab("features")}
        >
          ✨ Feature Guides
          <span className="tab-badge">{filteredFeatures.length}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === "faq" ? "active" : ""}`}
          onClick={() => setActiveTab("faq")}
        >
          ❓ FAQ & Troubleshooting
          <span className="tab-badge">{filteredFaqs.length}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === "architecture" ? "active" : ""}`}
          onClick={() => setActiveTab("architecture")}
        >
          💻 Technical Overview
        </button>
      </div>

      {/* TAB 1: GETTING STARTED */}
      {activeTab === "getting-started" && (
        <div>
          <div className="card-panel">
            <h2 className="panel-title">
              <span>🛍️</span> Merchant Setup Guide: Enabling Announcement Bars
            </h2>
            <p className="panel-subtitle">
              Announcement Bar uses Shopify Theme App Extensions. Follow these 4 easy steps once per theme template to display active bars on your live store without writing code.
            </p>

            <div className="step-list">
              <div className="step-item">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h4>Open Shopify Theme Customizer</h4>
                  <p>
                    From your Shopify Admin dashboard, go to <strong>Online Store → Themes</strong>. Locate your active theme and click <strong>Customize</strong>.
                  </p>
                </div>
              </div>

              <div className="step-item">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h4>Add the Announcement Bar App Section</h4>
                  <p>
                    In the Theme Editor sidebar, click <strong>Add section</strong> (or navigate to the <strong>Apps</strong> tab) and choose <strong>Announcement bar</strong> from the list of app blocks.
                  </p>
                </div>
              </div>

              <div className="step-item">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h4>Configure Section Position & Sticky Behavior</h4>
                  <p>
                    Use the theme block settings panel to select whether the bar appears at the <strong>Top</strong> or <strong>Bottom</strong> of the page, and toggle <strong>Sticky positioning</strong>.
                  </p>
                </div>
              </div>

              <div className="step-item">
                <div className="step-number">4</div>
                <div className="step-content">
                  <h4>Save Changes & Manage Bars</h4>
                  <p>
                    Click <strong>Save</strong> in the top right corner. Any active announcement bars configured in this dashboard will now display automatically according to their targeting rules.
                  </p>
                </div>
              </div>
            </div>

            <div className="callout-box">
              <strong>💡 Pro Tip:</strong> You only need to add the Announcement Bar app section once per theme template! Once added, you can add, edit, schedule, or disable bars directly from this admin app anytime.
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FEATURE GUIDES */}
      {activeTab === "features" && (
        <div>
          <div className="feature-grid">
            {filteredFeatures.length === 0 ? (
              <p style={{ color: "#6d7175", fontStyle: "italic" }}>No matching features found.</p>
            ) : (
              filteredFeatures.map((feat) => (
                <div key={feat.id} className="feature-card">
                  <div className="feature-card-header">
                    <h3 className="feature-card-title">
                      {feat.icon} {feat.title}
                    </h3>
                    <span className="feature-tag">{feat.tag}</span>
                  </div>
                  <p className="feature-summary">{feat.summary}</p>
                  <ul className="feature-details-list">
                    {feat.details.map((detail, idx) => (
                      <li key={idx}>{detail}</li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: FAQ & TROUBLESHOOTING */}
      {activeTab === "faq" && (
        <div>
          <div className="card-panel">
            <h2 className="panel-title">
              <span>❓</span> Frequently Asked Questions & Troubleshooting
            </h2>
            <p className="panel-subtitle">
              Quick answers to common questions about bar display, targeting logic, and storefront integration.
            </p>

            <div className="faq-list">
              {filteredFaqs.length === 0 ? (
                <p style={{ color: "#6d7175", fontStyle: "italic" }}>No matching FAQ items found for your search.</p>
              ) : (
                filteredFaqs.map((faq) => {
                  const isOpen = expandedFaq === faq.id;
                  return (
                    <div key={faq.id} className={`faq-item ${isOpen ? "open" : ""}`}>
                      <button
                        className="faq-question-btn"
                        onClick={() => setExpandedFaq(isOpen ? null : faq.id)}
                      >
                        <span>{faq.question}</span>
                        <span className="faq-chevron">▼</span>
                      </button>
                      {isOpen && <div className="faq-answer">{faq.answer}</div>}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TECHNICAL ARCHITECTURE */}
      {activeTab === "architecture" && (
        <div>
          <div className="card-panel">
            <h2 className="panel-title">
              <span>⚙️</span> Technical Stack & How It Works
            </h2>
            <p className="panel-subtitle">
              Under the hood details on how Announcement Bar serves lightweight, high-performance bars securely to your storefront.
            </p>

            <h3>Core Technology Stack</h3>
            <table className="tech-table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Technology</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Framework</strong></td>
                  <td><span className="tech-badge">React Router 7 (Remix)</span></td>
                  <td>Full-stack framework powering admin loaders, actions, and UI navigation.</td>
                </tr>
                <tr>
                  <td><strong>Admin UI</strong></td>
                  <td><span className="tech-badge">Shopify App Bridge & Polaris</span></td>
                  <td>Native Shopify Admin web components for seamless integration.</td>
                </tr>
                <tr>
                  <td><strong>Database</strong></td>
                  <td><span className="tech-badge">Prisma ORM + MySQL</span></td>
                  <td>Relational database storing announcements, schedules, targeting, and merchant sessions.</td>
                </tr>
                <tr>
                  <td><strong>API Endpoint</strong></td>
                  <td><span className="tech-badge">Shopify App Proxy</span></td>
                  <td>Secure endpoint (<span className="tech-badge">/apps/announcement-bar/bars</span>) delivering targeted bar payloads.</td>
                </tr>
                <tr>
                  <td><strong>Storefront</strong></td>
                  <td><span className="tech-badge">Liquid + Vanilla JS + CSS</span></td>
                  <td>Ultra-lightweight rendering script (no heavy frontend framework overhead).</td>
                </tr>
              </tbody>
            </table>

            <h3 style={{ marginTop: "28px" }}>Storefront Data Flow</h3>
            <div className="workflow-steps">
              <div className="workflow-card">
                <h5>1. Merchant Configures</h5>
                <p>Merchant creates bars in Admin. Settings save to MySQL database via Prisma ORM.</p>
              </div>
              <div className="workflow-card">
                <h5>2. Storefront App Proxy</h5>
                <p>Theme App Extension calls proxied API endpoint passing page type, URL, and country.</p>
              </div>
              <div className="workflow-card">
                <h5>3. Backend Filter Engine</h5>
                <p>App filters saved bars by enabled status, campaign schedule window, page rule, and country.</p>
              </div>
              <div className="workflow-card">
                <h5>4. Dynamic JS Rendering</h5>
                <p>Vanilla JS builds the bar UI, initiates rotation tickers, countdowns, and cart goal monitors.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Support Footer */}
      <div className="support-card">
        <div className="support-info">
          <h3>Need further assistance?</h3>
          <p>Our support team is available to help you with custom setups or troubleshooting.</p>
        </div>
        <a
          href="mailto:support@announcementbar.app?subject=Announcement%20Bar%20Support"
          className="btn-support"
        >
          ✉️ Contact Support
        </a>
      </div>
    </div>
  );
}
