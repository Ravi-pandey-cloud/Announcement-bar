import React from "react";
import type { MetaFunction } from "react-router";
import { PublicPageLayout } from "../components/PublicPageLayout";

export const meta: MetaFunction = () => {
  return [
    { title: "Merchant Setup & Documentation Guide | Announcement Bar Pro" },
    {
      name: "description",
      content:
        "Official merchant user manual for Announcement Bar Pro: Theme extension setup, page & country targeting, scheduling, countdown timers, cart goals, and troubleshooting.",
    },
  ];
};

export default function DocumentationPublic() {
  return (
    <PublicPageLayout
      title="Merchant User Manual & Documentation"
      subtitle="Complete step-by-step guide to installing, configuring, styling, targeting, and troubleshooting Announcement Bar Pro on your Shopify store."
      badge="Official User Guide"
      activeTab="documentation"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .doc-layout {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 32px;
        }

        .doc-sidebar {
          background: #ffffff;
          border: 1px solid #e3e3e3;
          border-radius: 12px;
          padding: 20px;
          position: sticky;
          top: 90px;
          height: fit-content;
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        }

        .doc-sidebar-title {
          font-size: 14px;
          font-weight: 700;
          color: #6d7175;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }

        .doc-sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .doc-sidebar-link {
          font-size: 13px;
          font-weight: 500;
          color: #303030;
          text-decoration: none;
          padding: 6px 10px;
          border-radius: 6px;
          transition: background-color 0.15s;
        }

        .doc-sidebar-link:hover {
          background-color: #f1f2f3;
          color: #1a1a1a;
        }

        .doc-content {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .doc-section {
          background: #ffffff;
          border: 1px solid #e3e3e3;
          border-radius: 12px;
          padding: 32px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          scroll-margin-top: 100px;
        }

        .doc-section h2 {
          font-size: 22px;
          font-weight: 700;
          color: #1a1a1a;
          margin-top: 0;
          margin-bottom: 16px;
          border-bottom: 2px solid #f1f2f3;
          padding-bottom: 8px;
        }

        .doc-section h3 {
          font-size: 16px;
          font-weight: 700;
          color: #202223;
          margin-top: 20px;
          margin-bottom: 8px;
        }

        .doc-section p, .doc-section li {
          font-size: 14px;
          line-height: 1.6;
          color: #303030;
        }

        .doc-section ol, .doc-section ul {
          padding-left: 20px;
          margin-bottom: 16px;
        }

        .step-box {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 16px 20px;
          margin: 16px 0;
        }

        .step-box p {
          margin: 0;
          font-weight: 600;
          color: #1a1a1a;
        }

        .code-snippet {
          background: #1a1a1a;
          color: #34d399;
          padding: 12px 16px;
          border-radius: 8px;
          font-family: monospace;
          font-size: 13px;
          margin: 12px 0;
          overflow-x: auto;
        }

        @media (max-width: 900px) {
          .doc-layout {
            grid-template-columns: 1fr;
          }
          .doc-sidebar {
            display: none;
          }
        }
      `,
        }}
      />

      <div className="doc-layout">
        {/* Sidebar Table of Contents */}
        <aside className="doc-sidebar">
          <div className="doc-sidebar-title">Documentation Index</div>
          <nav className="doc-sidebar-nav">
            <a href="#getting-started" className="doc-sidebar-link">1. Getting Started</a>
            <a href="#theme-extension" className="doc-sidebar-link">2. Theme Extension Installation</a>
            <a href="#creating-bars" className="doc-sidebar-link">3. Creating Announcement Bars</a>
            <a href="#targeting" className="doc-sidebar-link">4. Page & Country Targeting</a>
            <a href="#scheduling" className="doc-sidebar-link">5. Campaign Scheduling</a>
            <a href="#countdown-timer" className="doc-sidebar-link">6. Countdown Timers</a>
            <a href="#multiple-bars" className="doc-sidebar-link">7. Multiple Bar Rotation</a>
            <a href="#cart-goal" className="doc-sidebar-link">8. Free-Shipping Cart Goal</a>
            <a href="#styling" className="doc-sidebar-link">9. Styling & Customization</a>
            <a href="#troubleshooting" className="doc-sidebar-link">10. Troubleshooting Checklist</a>
          </nav>
        </aside>

        {/* Main Content */}
        <div className="doc-content">
          {/* Section 1 */}
          <section id="getting-started" className="doc-section">
            <h2>1. Getting Started</h2>
            <p>
              Welcome to <strong>Announcement Bar Pro</strong>! This app enables Shopify merchants to display high-converting promotional banners, countdown timers, multi-bar carousels, and free-shipping progress bars directly on your storefront.
            </p>
            <h3>Core App Workflow</h3>
            <ol>
              <li>Install the Theme App Extension in your active Shopify Theme Editor.</li>
              <li>Create and customize your announcement bar in the app dashboard.</li>
              <li>Configure targeting, scheduling, and rotation preferences.</li>
              <li>Toggle the bar to <strong>Enabled</strong> and publish your theme changes.</li>
            </ol>
          </section>

          {/* Section 2 */}
          <section id="theme-extension" className="doc-section">
            <h2>2. Installing the Theme App Extension</h2>
            <p>
              Announcement Bar Pro uses Shopify App Blocks for zero-code theme integration, guaranteeing compatibility with all Online Store 2.0 themes without modifying theme code files.
            </p>
            <div className="step-box">
              <p>📍 Theme Customizer Path:</p>
              <code>Online Store → Themes → Customize → Add section → Apps → Announcement bar</code>
            </div>
            <h3>Installation Steps:</h3>
            <ol>
              <li>From your Shopify Admin, navigate to <strong>Online Store → Themes</strong>.</li>
              <li>Click <strong>Customize</strong> next to your live or draft theme.</li>
              <li>In the left sidebar, click <strong>Add section</strong> (or Add block inside Header).</li>
              <li>Select the <strong>Apps</strong> tab and click <strong>Announcement bar</strong>.</li>
              <li>Click <strong>Save</strong> in the top-right corner of the Theme Editor.</li>
            </ol>
            <p>
              <em>Note:</em> The App Block must be added to each theme template (e.g. Header, Home, Products) where you want announcement bars to appear.
            </p>
          </section>

          {/* Section 3 */}
          <section id="creating-bars" className="doc-section">
            <h2>3. Creating & Managing Announcement Bars</h2>
            <p>To create your first bar:</p>
            <ol>
              <li>In the app dashboard, click <strong>Create Announcement</strong>.</li>
              <li>Enter an internal <strong>Bar Name</strong> (e.g., "Summer Flash Sale Banner").</li>
              <li>Enter your customer-facing <strong>Message Text</strong>.</li>
              <li>Use the live preview panel on the right side of the screen to inspect your design.</li>
              <li>Click <strong>Save Announcement</strong>.</li>
            </ol>
            <h3>Dashboard Management Controls:</h3>
            <ul>
              <li><strong>Enable / Disable Switch:</strong> Toggle a bar on or off at any time.</li>
              <li><strong>Duplicate:</strong> Create a copy of an existing bar as a draft.</li>
              <li><strong>Delete:</strong> Remove an announcement bar permanently.</li>
              <li><strong>Reorder Sequence:</strong> Adjust the bar sequence to establish rotation priority.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section id="targeting" className="doc-section">
            <h2>4. Page & Location Targeting</h2>
            <p>Control exactly where and to whom your announcement bar is shown:</p>
            <h3>Page Targeting:</h3>
            <ul>
              <li><strong>All Pages:</strong> Renders across the entire storefront.</li>
              <li><strong>Home Page:</strong> Displays exclusively on <code>/</code>.</li>
              <li><strong>Collection Pages:</strong> Displays on collection listing pages (<code>/collections/*</code>).</li>
              <li><strong>Product Pages:</strong> Displays on product detail pages (<code>/products/*</code>).</li>
              <li><strong>Cart Page:</strong> Displays on the cart page (<code>/cart</code>).</li>
              <li><strong>Custom URL:</strong> Displays on a specific page path matching your criteria.</li>
            </ul>
            <h3>Country & Geolocation Targeting:</h3>
            <p>
              Select specific ISO country codes (e.g., US, CA, UK, DE). The app evaluates the shopper's country location context via Shopify storefront localization to serve targeted currency or shipping promotions.
            </p>
          </section>

          {/* Section 5 */}
          <section id="scheduling" className="doc-section">
            <h2>5. Campaign Scheduling</h2>
            <p>Schedule promotions in advance for seasonal sales or product launches:</p>
            <ul>
              <li><strong>Start Date & Time:</strong> The bar will remain hidden until this timestamp.</li>
              <li><strong>End Date & Time:</strong> The bar will automatically stop displaying after this timestamp.</li>
            </ul>
            <p>The dashboard displays clear status badges:</p>
            <ul>
              <li><span style={{ color: '#1a73e8', fontWeight: 600 }}>Scheduled:</span> Pending start time.</li>
              <li><span style={{ color: '#137333', fontWeight: 600 }}>Active:</span> Currently running live.</li>
              <li><span style={{ color: '#c5221f', fontWeight: 600 }}>Expired:</span> Campaign finished.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section id="countdown-timer" className="doc-section">
            <h2>6. Countdown Timers</h2>
            <p>
              Drive conversion urgency by enabling a real-time countdown timer bound to a target expiration timestamp.
            </p>
            <h3>Timer Options:</h3>
            <ul>
              <li><strong>Live Countdown:</strong> Renders days, hours, minutes, and seconds.</li>
              <li><strong>Replacement Message:</strong> Specify text (e.g. "Flash Sale Expired!") to replace the timer when zero is reached.</li>
              <li><strong>Auto-Hide:</strong> If no replacement message is set, the bar automatically disappears when the countdown finishes.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section id="multiple-bars" className="doc-section">
            <h2>7. Multiple Bar Rotation</h2>
            <p>When multiple active bars match the same page, choose your preferred display mode:</p>
            <ul>
              <li><strong>Static:</strong> Shows the top-priority bar based on your dashboard sequence.</li>
              <li><strong>Carousel:</strong> Automatically rotates through active bars with smooth slide/fade transitions at your set duration (e.g., 5 seconds). Includes optional navigation arrows.</li>
              <li><strong>Scrolling Text (Marquee):</strong> Displays continuous ticker text animation scrolling across the header.</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section id="cart-goal" className="doc-section">
            <h2>8. Free-Shipping Cart Goal Progress Bar</h2>
            <p>
              Encourage higher average order value (AOV) by displaying a dynamic spending progress bar.
            </p>
            <div className="code-snippet">
              Free shipping on orders over $50! Add {"{amount}"} more to qualify.
            </div>
            <h3>How It Works:</h3>
            <ol>
              <li>Set your target goal threshold amount (e.g. <code>50</code>).</li>
              <li>Use the <code>{"{amount}"}</code> template variable in your progress message.</li>
              <li>The storefront App Block listens to Shopify <code>/cart.js</code> AJAX updates and recalculates the remaining balance in real time.</li>
              <li>When the cart total reaches $50, the bar automatically transitions to your custom <strong>Goal Achieved Message</strong> (e.g., "🎉 You unlocked Free Shipping!").</li>
            </ol>
          </section>

          {/* Section 9 */}
          <section id="styling" className="doc-section">
            <h2>9. Styling & Customization</h2>
            <p>Tailor your announcement bars to match your store's brand identity:</p>
            <ul>
              <li><strong>Colors & Gradients:</strong> Solid background color or multi-color linear gradient with animated background options.</li>
              <li><strong>Typography:</strong> Font family, font size, subtext font size, and bold formatting.</li>
              <li><strong>CTA Button:</strong> Custom button text, link destination URL, button background, and hover states.</li>
              <li><strong>Position & Sticky Behavior:</strong> Position at Top or Bottom of page, with optional fixed Sticky header scroll behavior.</li>
              <li><strong>Dismiss Button:</strong> Close ('×') button with session memory to prevent re-showing during the visitor's browsing session.</li>
            </ul>
          </section>

          {/* Section 10 */}
          <section id="troubleshooting" className="doc-section">
            <h2>10. Troubleshooting Checklist</h2>
            <p>If your announcement bar is not rendering on your storefront, follow this 5-step checklist:</p>
            <div className="step-box">
              <p>🔍 Troubleshooting Steps:</p>
              <ol>
                <li><strong>Verify Theme Customizer:</strong> Ensure the Announcement Bar App Block is added in your active Shopify Theme Editor and saved.</li>
                <li><strong>Check Enabled Toggle:</strong> Confirm the bar status switch is set to <strong>Enabled</strong> in the app dashboard.</li>
                <li><strong>Check Schedule Dates:</strong> Verify current time falls between your Start Date and End Date.</li>
                <li><strong>Check Page & Country Rules:</strong> Ensure your test URL and IP location match the bar's targeting rules.</li>
                <li><strong>Check Browser Network Tab:</strong> Open DevTools → Network tab, reload your store page, and filter for <code>/apps/announcement-bar/bars</code>. Confirm it returns HTTP 200 OK.</li>
              </ol>
            </div>
          </section>
        </div>
      </div>
    </PublicPageLayout>
  );
}
