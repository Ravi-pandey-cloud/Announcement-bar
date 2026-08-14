import React from "react";

interface PublicPageLayoutProps {
  title: string;
  subtitle: string;
  badge?: string;
  activeTab: "documentation" | "faq" | "privacy-policy" | "legal";
  children: React.ReactNode;
}

export function PublicPageLayout({
  title,
  subtitle,
  badge,
  activeTab,
  children,
}: PublicPageLayoutProps) {
  return (
    <div className="public-page-shell">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .public-page-shell {
          min-height: 100vh;
          background-color: #f6f6f7;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #202223;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .public-header-bar {
          background-color: #ffffff;
          border-bottom: 1px solid #e3e3e3;
          padding: 16px 32px;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        }

        .header-content-inner {
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .brand-logo-group {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: #1a1a1a;
        }

        .brand-icon-box {
          width: 36px;
          height: 36px;
          background: #1a1a1a;
          color: #ffffff;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 700;
        }

        .brand-title {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.3px;
        }

        .public-nav-links {
          display: flex;
          gap: 8px;
          overflow-x: auto;
        }

        .pub-nav-link {
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 600;
          color: #6d7175;
          text-decoration: none;
          border-radius: 6px;
          transition: background-color 0.15s, color 0.15s;
          white-space: nowrap;
        }

        .pub-nav-link:hover {
          color: #202223;
          background-color: #f1f2f3;
        }

        .pub-nav-link.active {
          color: #1a1a1a;
          background-color: #e4e5e7;
        }

        .public-hero-section {
          background-color: #ffffff;
          border-bottom: 1px solid #e3e3e3;
          padding: 40px 32px 32px 32px;
        }

        .hero-inner {
          max-width: 1100px;
          margin: 0 auto;
        }

        .hero-top-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .hero-title {
          font-size: 32px;
          font-weight: 800;
          color: #1a1a1a;
          margin: 0;
          letter-spacing: -0.5px;
        }

        .hero-badge {
          background: #e4e5e7;
          color: #202223;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 12px;
        }

        .hero-subtitle {
          font-size: 16px;
          color: #6d7175;
          margin: 0;
          line-height: 1.5;
          max-width: 760px;
        }

        .public-body-container {
          max-width: 1100px;
          margin: 32px auto;
          padding: 0 32px;
          box-sizing: border-box;
        }

        .public-footer {
          background-color: #ffffff;
          border-top: 1px solid #e3e3e3;
          padding: 32px;
          margin-top: 64px;
        }

        .footer-inner {
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          font-size: 13px;
          color: #6d7175;
        }

        .footer-links {
          display: flex;
          gap: 16px;
        }

        .footer-links a {
          color: #6d7175;
          text-decoration: none;
        }

        .footer-links a:hover {
          color: #1a1a1a;
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .public-header-bar, .public-hero-section, .public-body-container, .public-footer {
            padding-left: 16px;
            padding-right: 16px;
          }
          .hero-title {
            font-size: 24px;
          }
          .header-content-inner {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
        }
      `,
        }}
      />

      {/* Standalone Header */}
      <header className="public-header-bar">
        <div className="header-content-inner">
          <a href="/documentation" className="brand-logo-group">
            <div className="brand-icon-box">📣</div>
            <span className="brand-title">Announcement Bar Pro</span>
          </a>

          <nav className="public-nav-links">
            <a
              href="/documentation"
              className={`pub-nav-link ${activeTab === "documentation" ? "active" : ""}`}
            >
              📖 Documentation
            </a>
            <a
              href="/faq"
              className={`pub-nav-link ${activeTab === "faq" ? "active" : ""}`}
            >
              ❓ FAQ
            </a>
            <a
              href="/privacy-policy"
              className={`pub-nav-link ${activeTab === "privacy-policy" ? "active" : ""}`}
            >
              🔒 Privacy Policy
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="public-hero-section">
        <div className="hero-inner">
          <div className="hero-top-row">
            <h1 className="hero-title">{title}</h1>
          </div>
          <p className="hero-subtitle">{subtitle}</p>
        </div>
      </section>

      {/* Main Body */}
      <main className="public-body-container">{children}</main>

      {/* Footer */}
      <footer className="public-footer">
        <div className="footer-inner">
          <div>
            © 2026 Announcement Bar Pro. All rights reserved.
          </div>
          <div className="footer-links">
            <a href="/documentation">Documentation</a>
            <a href="/faq">FAQ</a>
            <a href="/privacy-policy">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
