import React from "react";
import type { MetaFunction } from "react-router";
import { PublicPageLayout } from "../components/PublicPageLayout";

export const meta: MetaFunction = () => {
  return [
    { title: "Privacy Policy | Announcement Bar Pro" },
    {
      name: "description",
      content:
        "Official Merchant & Storefront Privacy Policy for Announcement Bar Pro Shopify App.",
    },
  ];
};

export default function PrivacyPolicyPublic() {
  return (
    <PublicPageLayout
      title="Privacy Policy"
      subtitle="Comprehensive statement on how Announcement Bar Pro processes store metadata, storefront App Proxy requests, and handles merchant & customer privacy."
      badge="Merchant & Storefront Policy"
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

        .highlight-box {
          background-color: #f8f9fa;
          border-left: 4px solid #1a1a1a;
          padding: 16px 20px;
          border-radius: 0 8px 8px 0;
          margin: 16px 0;
        }

        .highlight-box p {
          margin: 0;
          font-weight: 500;
        }

        .contact-card {
          background-color: #f1f8f5;
          border: 1px solid #c2e7d9;
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
        <h2>1. Overview & Scope</h2>
        <p>
          This Privacy Policy describes how <strong>Announcement Bar Pro</strong> ("the Application") collects, uses, processes, and protects information when installed on a Shopify store ("Merchant Store") or when rendering promotional announcement bars to storefront visitors ("Shoppers").
        </p>
        <div className="highlight-box">
          <p>
            <strong>Core Privacy Commitment:</strong> Announcement Bar Pro does NOT store, sell, or collect Personally Identifiable Information (PII) from store shoppers. All customer targeting rules (such as tags and order spend) are evaluated dynamically in-memory via Shopify App Proxy and are never saved to our servers.
          </p>
        </div>
      </div>

      <div className="policy-card">
        <h2>2. Information Collected</h2>
        <p>To provide core announcement bar functionality, the Application collects and stores the following merchant and store data:</p>
        <ul>
          <li>
            <strong>Shopify Merchant Store Metadata:</strong> Store permanent domain (e.g. <code>myshopify.com</code>), primary shop locale, shop timezone, and OAuth access tokens required to authenticate API requests with Shopify Admin.
          </li>
          <li>
            <strong>Announcement Bar Configurations:</strong> Announcement titles, promotional message text, color themes (backgrounds, gradients, borders), font selections, rotation rules, page display rules, scheduling dates, country targeting codes, and cart threshold goals.
          </li>
          <li>
            <strong>Aggregate Analytics:</strong> Anonymous, aggregated view counts and click counts recorded per announcement bar to populate performance statistics in the merchant dashboard.
          </li>
        </ul>
      </div>

      <div className="policy-card">
        <h2>3. Storefront App Proxy & Customer Data Handling</h2>
        <p>When shoppers visit a merchant storefront containing an Announcement Bar Pro block:</p>
        <ul>
          <li>
            <strong>App Proxy Requests:</strong> The storefront script issues an authenticated request to <code>/apps/announcement-bar/bars</code> to fetch matching active announcements.
          </li>
          <li>
            <strong>Contextual Parameters:</strong> Request parameters such as page type (e.g., <code>home</code>, <code>product</code>), current page path, visitor ISO country code, customer tags, and total cart spend are transmitted over HTTPS to match targeting criteria.
          </li>
          <li>
            <strong>In-Memory Evaluation:</strong> Customer tags and order spend values are processed strictly in server memory during the request execution lifecycle and are immediately discarded. No customer IDs, names, email addresses, or purchasing histories are logged or stored.
          </li>
        </ul>
      </div>

      <div className="policy-card">
        <h2>4. Data Storage & Security</h2>
        <p>
          All application state and announcement configurations are persisted in a secure relational database (MySQL) via Prisma ORM with strict access controls.
        </p>
        <ul>
          <li>
            <strong>Admin API Security:</strong> Communication between the merchant Shopify Admin and our servers is authenticated using Shopify OAuth and App Bridge session tokens.
          </li>
          <li>
            <strong>App Proxy Security:</strong> All storefront App Proxy requests are verified using Shopify HMAC signature validation to prevent tampering and forged requests.
          </li>
          <li>
            <strong>HTTPS Encryption:</strong> All data in transit is encrypted using standard TLS/HTTPS protocols.
          </li>
        </ul>
      </div>

      <div className="policy-card">
        <h2>5. Data Retention & Uninstallation</h2>
        <p>
          When a merchant uninstalls Announcement Bar Pro from their Shopify store:
        </p>
        <ul>
          <li>
            <strong>Immediate Access Revocation:</strong> Active API access tokens are immediately revoked by Shopify.
          </li>
          <li>
            <strong>Retention Window:</strong> Merchant configurations are retained for up to 48 hours to allow seamless restoration in the event of an accidental uninstallation.
          </li>
          <li>
            <strong>Shop Redaction:</strong> Upon receipt of Shopify's mandatory <code>shop/redact</code> privacy webhook, all announcements, analytics records, shop plan data, and authentication sessions associated with the shop domain are permanently deleted from our database.
          </li>
        </ul>
      </div>

      <div className="policy-card">
        <h2>6. GDPR & Mandatory Privacy Webhooks</h2>
        <p>
          Announcement Bar Pro fully complies with Shopify's mandatory GDPR and data privacy frameworks:
        </p>
        <ul>
          <li>
            <strong><code>customers/data_request</code>:</strong> Since the app does not store customer PII, data requests return a verified empty payload acknowledging no personal data is held.
          </li>
          <li>
            <strong><code>customers/redact</code>:</strong> Since no customer PII is stored, customer redactions are processed automatically.
          </li>
          <li>
            <strong><code>shop/redact</code>:</strong> Triggers complete, irreversible deletion of all merchant shop data within the required timeframe.
          </li>
        </ul>
      </div>

      <div className="policy-card">
        <h2>7. Merchant Rights & Support Contact</h2>
        <p>
          Merchants have the right to request clarification, inspection, or manual deletion of their stored app configuration data at any time.
        </p>
        <div className="contact-card">
          <p><strong>Merchant Support Channel:</strong> Shopify Partner Dashboard App Support</p>
          <p><strong>Email Configuration Reference:</strong> <code>[SUPPORT_EMAIL_ADDRESS — Configured in Shopify Partner Dashboard]</code></p>
          <p><strong>Support SLA:</strong> Standard support inquiries are answered within 24 business hours.</p>
        </div>
      </div>
    </PublicPageLayout>
  );
}
