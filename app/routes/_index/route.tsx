import type { LoaderFunctionArgs } from "react-router";
import { redirect, Form, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

const FEATURES: {
  icon: string;
  title: string;
  points: string[];
}[] = [
  {
    icon: "🗂️",
    title: "Announcement dashboard",
    points: [
      "Create, edit, duplicate, and delete bars from one dedicated page.",
      "Enable/disable instantly with a toggle, and reorder how bars rotate.",
      "At-a-glance counts of Active / Scheduled / Draft, plus per-bar status badges.",
      "Live preview of message, button, and colors while editing.",
    ],
  },
  {
    icon: "🎯",
    title: "Page & audience targeting",
    points: [
      "Show different bars on Home, Collection, Product, or Cart pages — or one custom page.",
      "Restrict a bar to specific countries, detected from the shopper's localization.",
      "Run region-only promotions or page-specific messaging, like a cart-only shipping notice.",
    ],
  },
  {
    icon: "🗓️",
    title: "Campaign scheduling",
    points: [
      "Set an optional start and end date/time per bar.",
      "Bars switch on and off automatically — no manual toggling required.",
      "Dashboard badges track the campaign through Scheduled → Active → Expired.",
    ],
  },
  {
    icon: "⏱️",
    title: "Countdown timers",
    points: [
      "Attach a live, second-by-second countdown to any bar's end time.",
      'Optional replacement message once time runs out (e.g. "Sale has ended").',
      "No replacement message set? The bar simply disappears when the timer hits zero.",
    ],
  },
  {
    icon: "🔁",
    title: "Multiple bars & rotation",
    points: [
      "Combine several active bars and choose how they rotate.",
      "Static, Carousel (fade/slide), or Scrolling text (continuous marquee).",
      "Control the rotation order directly from the dashboard.",
    ],
  },
  {
    icon: "🛒",
    title: "Cart goal progress bar",
    points: [
      'A "spend more to unlock X" progress bar driven by the live cart total.',
      "Customizable in-progress and goal-reached messages.",
      "Updates live as the shopper's cart changes — no page reload needed.",
    ],
  },
  {
    icon: "🎨",
    title: "Styling & content",
    points: [
      "Custom background and text color per bar.",
      "Optional call-to-action button with its own label and link.",
      "Dismissible with an '×' — dismissal is remembered for the shopper's session.",
      "Configurable position (top/bottom) and sticky behavior, per theme.",
    ],
  },
];

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className="landing">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        * { box-sizing: border-box; }

        .landing {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #202223;
          background-color: #f6f6f7;
          min-height: 100vh;
        }

        .hero {
          background: linear-gradient(135deg, #1a1a1a 0%, #2f2f33 100%);
          color: #ffffff;
          padding: 72px 24px 96px;
          text-align: center;
        }

        .hero-eyebrow {
          display: inline-block;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #c9cccf;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.16);
          border-radius: 999px;
          padding: 6px 14px;
          margin-bottom: 20px;
        }

        .hero h1 {
          font-size: clamp(28px, 4vw, 42px);
          font-weight: 700;
          margin: 0 0 14px;
          line-height: 1.2;
        }

        .hero p {
          font-size: 17px;
          color: #d3d3d6;
          max-width: 620px;
          margin: 0 auto 36px;
          line-height: 1.6;
        }

        .login-form {
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
          max-width: 480px;
          margin: 0 auto;
          align-items:center;
        }

        .login-field {
          flex: 1 1 260px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          text-align: left;
        }

        .login-field span.label {
          font-size: 13px;
          color: #c9cccf;
        }

        .login-field input {
          padding: 12px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.24);
          background: rgba(255,255,255,0.06);
          color: #ffffff;
          font-size: 14px;
          outline: none;
        }

        .login-field input::placeholder {
          color: #9a9a9e;
        }

        .login-field input:focus {
          border-color: #ffffff;
        }

        .login-field span.hint {
          font-size: 12px;
          color: #9a9a9e;
        }

        .btn-primary {
          background-color: #ffffff;
          color: #1a1a1a;
          border: none;
          padding: 12px 22px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: background-color 0.15s ease, transform 0.1s ease;
        }

        .btn-primary:hover { background-color: #ececec; }
        .btn-primary:active { transform: scale(0.98); }

        .section {
          max-width: 1080px;
          margin: -48px auto 0;
          padding: 0 24px 72px;
        }

        .section-intro {
          background: #ffffff;
          border: 1px solid #e3e3e3;
          border-radius: 14px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
          padding: 28px 32px;
          margin-bottom: 40px;
        }

        .section-intro h2 {
          font-size: 20px;
          margin: 0 0 10px;
        }

        .section-intro p {
          font-size: 14.5px;
          color: #4a4a4a;
          line-height: 1.7;
          margin: 0;
        }

        .features-heading {
          font-size: 22px;
          font-weight: 700;
          margin: 0 0 4px;
          text-align: center;
        }

        .features-subheading {
          font-size: 14.5px;
          color: #6d7175;
          text-align: center;
          margin: 0 0 32px;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 18px;
        }

        .feature-card {
          background: #ffffff;
          border: 1px solid #e3e3e3;
          border-radius: 12px;
          padding: 22px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }

        .feature-icon {
          font-size: 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: #f1f2f3;
          margin-bottom: 14px;
        }

        .feature-card h3 {
          font-size: 15.5px;
          font-weight: 600;
          margin: 0 0 10px;
        }

        .feature-card ul {
          margin: 0;
          padding-left: 18px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .feature-card li {
          font-size: 13.5px;
          color: #4a4a4a;
          line-height: 1.5;
        }

        @media (max-width: 560px) {
          .hero { padding: 56px 18px 80px; }
          .section { margin-top: -40px; padding: 0 16px 56px; }
          .section-intro { padding: 22px; }
        }
      `,
        }}
      />

      <div className="hero">
        <span className="hero-eyebrow">Shopify App</span>
        <h1>Announcement Bar</h1>
        <p>
          Create and manage promotional bars for your storefront — sales,
          shipping notices, flash-sale countdowns, and free-shipping progress
          goals — without editing a single line of theme code.
        </p>

        {showForm && (
          <Form className="login-form" method="post" action="/auth/login">
            <label className="login-field">
              <span className="label">Shop domain</span>
              <input type="text" name="shop" placeholder="my-shop-domain.myshopify.com" />
              <span className="hint">e.g. my-shop-domain.myshopify.com</span>
            </label>
            <button className="btn-primary" type="submit">
              Log in
            </button>
          </Form>
        )}
      </div>

      <div className="section">
        <div className="section-intro">
          <h2>What this app does</h2>
          <p>
            The merchant manages everything from an embedded admin
            dashboard. The app saves each bar&apos;s settings to a database,
            and a lightweight storefront extension fetches and renders the
            active bars on the shop&apos;s live theme.
          </p>
        </div>

        <div className="features-heading">What we&apos;re providing</div>
        <p className="features-subheading">
          Everything a merchant needs to run announcement bars, end to end.
        </p>

        <div className="features-grid">
          {FEATURES.map((feature) => (
            <div className="feature-card" key={feature.title}>
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <ul>
                {feature.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
