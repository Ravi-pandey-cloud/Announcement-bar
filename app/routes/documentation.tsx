import React from "react";
import type { MetaFunction } from "react-router";
import { PublicPageLayout } from "../components/PublicPageLayout";

export const meta: MetaFunction = () => {
  return [
    { title: "Documentation | Announcement Bar Pro" },
    {
      name: "description",
      content: "Learn how to install and use Announcement Bar Pro on your Shopify store.",
    },
  ];
};

export default function DocumentationPublic() {
  return (
    <PublicPageLayout
      title="Documentation"
      subtitle="Learn how to install and use Announcement Bar Pro."
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
          background: #f8f9fa;
          color: #1a1a1a;
          border: 1px solid #e3e3e3;
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
          <div className="doc-sidebar-title">Sections</div>
          <nav className="doc-sidebar-nav">
            <a href="#getting-started" className="doc-sidebar-link">1. Getting Started</a>
            <a href="#installing-app" className="doc-sidebar-link">2. Installing the App</a>
            <a href="#creating-bar" className="doc-sidebar-link">3. Creating a Bar</a>
            <a href="#customizing-design" className="doc-sidebar-link">4. Customizing the Design</a>
            <a href="#targeting-rules" className="doc-sidebar-link">5. Setting Targeting Rules</a>
            <a href="#scheduling" className="doc-sidebar-link">6. Scheduling</a>
            <a href="#countdown-timer" className="doc-sidebar-link">7. Countdown Timer</a>
            <a href="#multiple-bars" className="doc-sidebar-link">8. Multiple Bars</a>
            <a href="#free-shipping" className="doc-sidebar-link">9. Free-Shipping Goal</a>
            <a href="#preview-publish" className="doc-sidebar-link">10. Preview & Publish</a>
            <a href="#troubleshooting" className="doc-sidebar-link">11. Troubleshooting</a>
          </nav>
        </aside>

        {/* Main Content */}
        <div className="doc-content">
          <section id="getting-started" className="doc-section">
            <h2>1. Getting Started</h2>
            <p>
              Announcement Bar Pro helps you showcase active promotions, countdown timers, and free-shipping targets directly on your storefront. The app uses Shopify's native App Blocks, so you do not need to edit any code.
            </p>
          </section>

          <section id="installing-app" className="doc-section">
            <h2>2. Installing the App</h2>
            <p>
              To show announcement bars on your store, you need to add the app block to your theme:
            </p>
            <ol>
              <li>In your Shopify Admin, go to <strong>Online Store</strong> &gt; <strong>Themes</strong>.</li>
              <li>Click <strong>Customize</strong> next to your active theme.</li>
              <li>In the left sidebar, click <strong>Add section</strong> or <strong>Add block</strong> (usually under the Header).</li>
              <li>Select <strong>Announcement Bar Pro</strong> from the App category.</li>
              <li>Click <strong>Save</strong> in the top-right corner.</li>
            </ol>
          </section>

          <section id="creating-bar" className="doc-section">
            <h2>3. Creating an Announcement Bar</h2>
            <p>
              Set up your first banner from the app dashboard:
            </p>
            <ol>
              <li>Click <strong>Create Announcement</strong>.</li>
              <li>Enter an internal name for your bar to find it easily later.</li>
              <li>Write your announcement message in the message editor.</li>
              <li>Configure targeting, styling, and timing settings as needed.</li>
              <li>Click <strong>Save</strong>.</li>
            </ol>
          </section>

          <section id="customizing-design" className="doc-section">
            <h2>4. Customizing the Design</h2>
            <p>
              You can style your announcement bar to match your brand:
            </p>
            <ul>
              <li><strong>Colors:</strong> Choose a solid background color or create custom linear gradients.</li>
              <li><strong>Typography:</strong> Select a Google Font and adjust font size to make your message stand out.</li>
              <li><strong>Dismiss Button:</strong> Add an '×' close button so customers can hide the bar. The app will remember this preference for the rest of their visit.</li>
              <li><strong>Call-to-Action:</strong> Add a button with a custom label and destination URL to guide users to your sales.</li>
            </ul>
          </section>

          <section id="targeting-rules" className="doc-section">
            <h2>5. Setting Targeting Rules</h2>
            <p>
              Choose who sees your announcement bar:
            </p>
            <ul>
              <li><strong>Pages:</strong> Show the bar on all pages, the home page only, specific collections, products, the cart page, or a custom URL path.</li>
              <li><strong>Location:</strong> Restrict the bar to specific countries using ISO country codes (e.g. US, CA, GB) to show relevant shipping rates or promotions.</li>
            </ul>
          </section>

          <section id="scheduling" className="doc-section">
            <h2>6. Scheduling an Announcement</h2>
            <p>
              Plan your campaigns in advance by choosing start and end dates:
            </p>
            <ul>
              <li><strong>Start Date:</strong> The bar will automatically appear at this time.</li>
              <li><strong>End Date:</strong> The bar will automatically hide when the promotional period ends.</li>
            </ul>
          </section>

          <section id="countdown-timer" className="doc-section">
            <h2>7. Adding a Countdown Timer</h2>
            <p>
              Build urgency for limited-time offers or flash sales:
            </p>
            <ol>
              <li>Enable the <strong>Countdown Timer</strong> setting.</li>
              <li>Select your target end date and time.</li>
              <li>Add a replacement message (e.g., "Flash sale has ended!") to display after the countdown finishes. If left blank, the bar will hide automatically.</li>
            </ol>
          </section>

          <section id="multiple-bars" className="doc-section">
            <h2>8. Using Multiple Announcement Bars</h2>
            <p>
              If you have more than one active announcement bar, you can configure how they are displayed:
            </p>
            <ul>
              <li><strong>Static:</strong> Displays only your highest-priority announcement bar.</li>
              <li><strong>Carousel:</strong> Automatically rotates through active bars with smooth slide or fade transitions.</li>
              <li><strong>Scrolling Text:</strong> Renders your announcements in a continuous moving ticker effect.</li>
            </ul>
          </section>

          <section id="free-shipping" className="doc-section">
            <h2>9. Free-Shipping Goal</h2>
            <p>
              Encourage customers to add more items to their cart to unlock free shipping:
            </p>
            <ol>
              <li>Set your target goal amount (e.g., 50 for $50).</li>
              <li>Use the <code>{"{amount}"}</code> placeholder in your announcement text.</li>
              <li>The app will automatically calculate and display the remaining balance dynamically.</li>
              <li>Set a custom <strong>Goal Achieved</strong> message (e.g., "Congratulations! You've unlocked free shipping.") that displays when the threshold is met.</li>
            </ol>
          </section>

          <section id="preview-publish" className="doc-section">
            <h2>10. Previewing and Publishing</h2>
            <p>
              You can preview how your announcement bar looks in the app editor's live preview pane as you customize it. Once you are satisfied with the design and settings, make sure the bar is set to <strong>Enabled</strong> on your dashboard.
            </p>
          </section>

          <section id="troubleshooting" className="doc-section">
            <h2>11. Troubleshooting</h2>
            <p>
              If your announcement bar is not showing on your store, verify the following:
            </p>
            <div className="step-box">
              <ol style={{ margin: 0 }}>
                <li>Confirm the Announcement Bar Pro app block is added to your active theme and the changes are saved.</li>
                <li>Make sure the bar is set to <strong>Enabled</strong> in the app dashboard.</li>
                <li>Verify that the current time falls within your scheduled start and end dates.</li>
                <li>Check that you are viewing a page and browsing from a location that matches your targeting rules.</li>
              </ol>
            </div>
          </section>
        </div>
      </div>
    </PublicPageLayout>
  );
}
