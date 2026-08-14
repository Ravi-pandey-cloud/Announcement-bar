import React from "react";
import type { MetaFunction } from "react-router";
import { PublicPageLayout } from "../components/PublicPageLayout";

export const meta: MetaFunction = () => {
  return [
    { title: "Privacy Policy | Announcement Bar Pro" },
    {
      name: "description",
      content: "Learn how Announcement Bar Pro collects, uses, and protects information.",
    },
  ];
};

export default function PrivacyPolicyPublic() {
  return (
    <PublicPageLayout
      title="Privacy Policy"
      subtitle="Learn how Announcement Bar Pro collects, uses, and protects information."
      activeTab="privacy-policy"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .policy-card {
          background: #ffffff;
          border: 1px solid #e3e3e3;
          border-radius: 12px;
          padding: 32px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }

        .policy-card h2 {
          font-size: 20px;
          font-weight: 700;
          color: #1a1a1a;
          margin-top: 0;
          margin-bottom: 14px;
          border-bottom: 2px solid #f1f2f3;
          padding-bottom: 8px;
        }

        .policy-card p, .policy-card li {
          font-size: 14px;
          line-height: 1.6;
          color: #303030;
        }

        .policy-card ul {
          padding-left: 20px;
          margin-bottom: 16px;
        }

        .policy-card li {
          margin-bottom: 8px;
        }

        .contact-card {
          background-color: #f8f9fa;
          border: 1px solid #e3e3e3;
          border-radius: 8px;
          padding: 20px;
          margin-top: 16px;
        }

        .contact-card p {
          margin: 4px 0;
        }
      `,
        }}
      />

      <div className="policy-card">
        <h2>1. Information We Collect</h2>
        <p>
          Announcement Bar Pro collects configuration settings you create for your announcement bars (such as banner text, styling choices, active schedules, and targeting rules) and basic store details necessary to authenticate the app and serve configurations.
        </p>
      </div>

      <div className="policy-card">
        <h2>2. How We Use Information</h2>
        <p>
          We use this information to run the application, verify store authorization, apply your customized styling settings, and display the correct announcement bars to your store visitors.
        </p>
      </div>

      <div className="policy-card">
        <h2>3. Shopify Store Data</h2>
        <p>
          When you install the app, we access store metadata provided by Shopify, including the store's primary domain name, language settings, timezone, and the access tokens required to communicate securely with your Shopify Admin.
        </p>
      </div>

      <div className="policy-card">
        <h2>4. Customer Data</h2>
        <p>
          We do not store personally identifiable information (PII) of your store's customers. When your customers visit the store, any conditions such as location (country) or cart spend are processed temporarily in memory to match targeting rules and are not saved on our servers.
        </p>
      </div>

      <div className="policy-card">
        <h2>5. Cookies and Similar Technologies</h2>
        <p>
          The app does not use tracking cookies. If you enable the close button on an announcement bar, we use browser session storage to remember that the visitor closed the bar, preventing it from showing again during the same visit.
        </p>
      </div>

      <div className="policy-card">
        <h2>6. Data Storage and Security</h2>
        <p>
          All application settings are stored in a secure cloud database. We follow industry standard security measures, including HTTPS encryption for all data in transit, to protect your store configurations and authorization tokens.
        </p>
      </div>

      <div className="policy-card">
        <h2>7. Data Retention</h2>
        <p>
          We retain your announcement settings and store metadata as long as the app is installed. If you uninstall the app, we save your configuration data for up to 48 hours in case of accidental removal.
        </p>
      </div>

      <div className="policy-card">
        <h2>8. Data Deletion</h2>
        <p>
          After the 48-hour uninstallation window passes, your store configurations and related records are permanently deleted from our database.
        </p>
      </div>

      <div className="policy-card">
        <h2>9. Shopify Privacy Webhooks / Merchant Requests</h2>
        <p>
          We support and comply with all Shopify mandatory privacy webhooks (customer data request, customer data redaction, and store data deletion) to ensure your store remains fully compliant with global data privacy requirements.
        </p>
      </div>

      <div className="policy-card">
        <h2>10. Third-Party Services</h2>
        <p>
          We do not share, sell, or distribute your store configuration or visitor details with any third-party marketing, analytics, or advertising platforms.
        </p>
      </div>

      <div className="policy-card">
        <h2>11. Merchant Rights</h2>
        <p>
          You have the right to request access to the configuration data we store or ask for manual deletion of your store configurations at any time.
        </p>
      </div>

      <div className="policy-card">
        <h2>12. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy or how we handle data, please contact us:
        </p>
        <div className="contact-card">
          <p><strong>Merchant Support:</strong> Shopify Partner Dashboard App Support</p>
          <p><strong>Email Address:</strong> support@announcementbarpro.com</p>
          <p><strong>Support SLA:</strong> Standard support inquiries are answered within 24 business hours.</p>
        </div>
      </div>
    </PublicPageLayout>
  );
}
