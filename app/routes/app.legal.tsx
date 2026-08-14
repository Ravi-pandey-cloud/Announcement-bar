import { useState } from "react";
import { Page, Layout, Card, Text, BlockStack, Divider } from "@shopify/polaris";

export default function LegalPage() {
  const [activeTab, setActiveTab] = useState<"privacy" | "terms" | "refund" | "contact">("privacy");

  return (
    <div className="legal-wrapper">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .legal-wrapper {
          padding: 32px;
          margin: 20px auto;
          max-width: 900px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #202223;
          background-color: #f6f6f7;
          min-height: 100vh;
        }

        .legal-header {
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

        /* Tabs Navigation */
        .nav-tabs {
          display: flex;
          gap: 8px;
          border-bottom: 1px solid #e3e3e3;
          margin-bottom: 24px;
          overflow-x: auto;
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
          white-space: nowrap;
        }

        .tab-btn:hover {
          color: #202223;
        }

        .tab-btn.active {
          color: #1a1a1a;
          border-bottom-color: #1a1a1a;
        }

        /* Content Cards */
        .card-panel {
          background: #ffffff;
          border: 1px solid #e3e3e3;
          border-radius: 12px;
          padding: 32px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          margin-bottom: 24px;
        }

        .card-panel h2 {
          font-size: 20px;
          font-weight: 700;
          color: #202223;
          margin: 0 0 16px 0;
        }

        .card-panel h3 {
          font-size: 16px;
          font-weight: 600;
          color: #202223;
          margin: 24px 0 12px 0;
        }

        .card-panel p {
          font-size: 14px;
          color: #4a4d51;
          line-height: 1.6;
          margin-bottom: 16px;
        }

        .card-panel ul {
          margin: 0 0 16px 0;
          padding-left: 20px;
          color: #4a4d51;
          font-size: 14px;
          line-height: 1.6;
        }

        .card-panel ul li {
          margin-bottom: 8px;
        }
        
        .contact-box {
          background-color: #f9fafb;
          border: 1px solid #e3e3e3;
          padding: 20px;
          border-radius: 8px;
          margin-top: 16px;
        }
        
        .contact-box p {
          margin-bottom: 8px;
        }
        
        .contact-box strong {
          color: #202223;
        }
      `,
        }}
      />

      {/* Header */}
      <div className="legal-header">
        <div className="header-title-section">
          <h1>Legal & Support</h1>
          <p>
            Review our policies, terms of service, and find merchant support contact information.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="nav-tabs">
        <button
          className={`tab-btn ${activeTab === "privacy" ? "active" : ""}`}
          onClick={() => setActiveTab("privacy")}
        >
          🔒 Privacy Policy
        </button>
        <button
          className={`tab-btn ${activeTab === "terms" ? "active" : ""}`}
          onClick={() => setActiveTab("terms")}
        >
          📄 Terms of Service
        </button>
        <button
          className={`tab-btn ${activeTab === "refund" ? "active" : ""}`}
          onClick={() => setActiveTab("refund")}
        >
          💸 Refund Policy
        </button>
        <button
          className={`tab-btn ${activeTab === "contact" ? "active" : ""}`}
          onClick={() => setActiveTab("contact")}
        >
          ✉️ Merchant Support
        </button>
      </div>

      {/* TAB 1: PRIVACY POLICY */}
      {activeTab === "privacy" && (
        <div className="card-panel">
          <h2>Privacy Policy</h2>
          <p>Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          
          <h3>Information We Collect</h3>
          <p>
            When you install the Announcement Bar app, we are automatically able to access certain types of information from your Shopify account:
          </p>
          <ul>
            <li><strong>Store Information:</strong> We store your shop domain, locale, and Shopify access tokens to provide the core functionality of the app.</li>
            <li><strong>Theme Data:</strong> Our App Block integrates with your theme, but we do not read or modify your underlying theme files.</li>
          </ul>

          <h3>How We Use Your Information</h3>
          <p>
            We use the information we collect to provide and maintain our Service. Specifically, we use your shop data to securely authenticate you, configure your announcement bars, and correctly serve those announcements to your storefront visitors via the Shopify App Proxy.
          </p>
          <p>
            <strong>Customer Data Privacy:</strong> Our app does NOT collect or store personally identifiable information (PII) from your store's end-customers. While we process customer tags and spend for targeting purposes, this is done on-the-fly and is never stored in our databases.
          </p>

          <h3>Data Retention & GDPR</h3>
          <p>
            When you uninstall the app, we retain your data for up to 48 hours to prevent accidental deletion in case of a reinstall. Following the receipt of Shopify's <code>shop/redact</code> webhook, we permanently delete your shop's settings, active bars, and analytical data from our systems.
          </p>
          <p>
            If you or your customers submit a data request or a redact request, we immediately comply and respond with the appropriate 200 OK status to Shopify's mandatory GDPR webhooks.
          </p>
        </div>
      )}

      {/* TAB 2: TERMS OF SERVICE */}
      {activeTab === "terms" && (
        <div className="card-panel">
          <h2>Terms of Service</h2>
          <p>Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

          <h3>1. Acceptance of Terms</h3>
          <p>
            By installing and using the Announcement Bar app ("Service"), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Service and must uninstall the app.
          </p>

          <h3>2. Usage Limits & Fair Use</h3>
          <p>
            You agree to use the app in accordance with the Shopify App Store guidelines. Your usage is subject to the limitations of your selected pricing tier. Unlimited tiers are subject to a fair use policy to prevent abuse that degrades the performance of our infrastructure.
          </p>

          <h3>3. Disclaimer of Warranties</h3>
          <p>
            The Service is provided "as is" and "as available". We do not warrant that the Service will be uninterrupted, error-free, or completely secure. We are not responsible for any indirect or consequential damages arising from the use of our Service, including loss of revenue or data.
          </p>

          <h3>4. Modifications to the Service</h3>
          <p>
            We reserve the right to modify or discontinue, temporarily or permanently, the Service (or any part thereof) with or without notice. We shall not be liable to you or to any third party for any modification, price change, suspension or discontinuance of the Service.
          </p>
        </div>
      )}

      {/* TAB 3: REFUND POLICY */}
      {activeTab === "refund" && (
        <div className="card-panel">
          <h2>Refund & Cancellation Policy</h2>
          
          <h3>Canceling Your Subscription</h3>
          <p>
            You can cancel your premium subscription at any time directly from the <strong>Pricing</strong> tab within the app, or by uninstalling the app entirely from your Shopify Admin.
          </p>
          <p>
            If you cancel via the app's Pricing page, your subscription will not renew, and your account will automatically downgrade to the Free plan at the end of your current billing cycle. 
          </p>

          <h3>App Uninstallation</h3>
          <p>
            Uninstalling the app will immediately cancel any active app subscription. No further charges will be applied. Your data will be scheduled for permanent deletion per our privacy policy.
          </p>

          <h3>Refunds</h3>
          <p>
            Because we offer a fully functional Free plan to test the app before upgrading, all charges for premium plans are final and non-refundable. 
          </p>
          <p>
            In the event of a duplicate charge or a billing error on our end, please reach out to our support team and we will issue a credit or refund for the erroneous charge.
          </p>
        </div>
      )}

      {/* TAB 4: MERCHANT SUPPORT */}
      {activeTab === "contact" && (
        <div className="card-panel">
          <h2>Merchant Support</h2>
          <p>
            Need help configuring a bar, troubleshooting a display issue, or have a feature request? Our support team is here to assist you.
          </p>

          <div className="contact-box">
            <p><strong>Merchant Support Channel:</strong> Shopify Partner Dashboard App Support Contact</p>
            <p><strong>Support Email Reference:</strong> <code>[SUPPORT_EMAIL_ADDRESS — Configured in Shopify Partner Dashboard]</code></p>
            <p><strong>Support Hours:</strong> Monday - Friday, 9:00 AM - 5:00 PM (EST)</p>
            <p><strong>Response Time:</strong> We aim to reply to all inquiries within 24 hours.</p>
          </div>
          
          <h3 style={{ marginTop: '24px' }}>Before You Contact Us</h3>
          <p>
            Please check the <a href="/app/documentation"><strong>Documentation</strong></a> and <a href="/app/faq"><strong>FAQ</strong></a> pages in the app navigation. Our comprehensive setup guides and FAQ section solve 95% of common issues, such as:
          </p>
          <ul>
            <li>Why your bar isn't displaying (Theme App Extension block placement)</li>
            <li>How scheduling and countdown timers work</li>
            <li>How to test location targeting rules</li>
          </ul>
        </div>
      )}
    </div>
  );
}
