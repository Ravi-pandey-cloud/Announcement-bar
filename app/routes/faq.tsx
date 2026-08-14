import React, { useState } from "react";
import type { MetaFunction } from "react-router";
import { PublicPageLayout } from "../components/PublicPageLayout";

export const meta: MetaFunction = () => {
  return [
    { title: "Frequently Asked Questions (FAQ) | Announcement Bar Pro" },
    {
      name: "description",
      content:
        "Comprehensive FAQ covering creation, targeting, scheduling, countdown timers, cart goals, and troubleshooting for Announcement Bar Pro.",
    },
  ];
};

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: React.ReactNode;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: "q1",
    category: "General",
    question: "What is Announcement Bar Pro?",
    answer: (
      <p>
        Announcement Bar Pro is a native Shopify app designed to boost conversions and store announcements. It allows merchants to create customizable header/footer bars, flash sale countdown timers, dynamic free-shipping cart goals, and rotating multi-message bars without writing code.
      </p>
    ),
  },
  {
    id: "q2",
    category: "Bar Management",
    question: "How do I create an announcement bar?",
    answer: (
      <p>
        Open the app dashboard in Shopify Admin, click <strong>Create Announcement</strong>, enter your message text, choose your visual styles (colors, fonts, gradients), set optional targeting rules or schedules, and click <strong>Save</strong>.
      </p>
    ),
  },
  {
    id: "q3",
    category: "Bar Management",
    question: "How do I enable or disable a bar?",
    answer: (
      <p>
        In the main dashboard table, toggle the switch next to any announcement bar. Enabled bars will render on your live storefront if targeting and schedule criteria match. Disabled bars remain saved in draft mode.
      </p>
    ),
  },
  {
    id: "q4",
    category: "Bar Management",
    question: "How do I edit, duplicate, delete, or reorder bars?",
    answer: (
      <div>
        <p>You can manage bars directly from your app dashboard:</p>
        <ul>
          <li><strong>Edit:</strong> Click the edit button on any bar row to modify content and styles.</li>
          <li><strong>Duplicate:</strong> Click the actions menu (<code>⋮</code>) and select <strong>Duplicate</strong> to create a copy as a draft.</li>
          <li><strong>Delete:</strong> Click the actions menu (<code>⋮</code>), select <strong>Delete</strong>, and confirm in the dialog.</li>
          <li><strong>Reorder:</strong> Adjust the bar sequence to control rotation order when multiple bars match the same page.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "q5",
    category: "Targeting",
    question: "How does page targeting work?",
    answer: (
      <p>
        You can choose where your bar appears: <strong>All pages</strong>, <strong>Home page</strong>, <strong>Collection pages</strong>, <strong>Product pages</strong>, <strong>Cart page</strong>, or a <strong>Custom page URL</strong>. The app automatically checks the current page type when serving announcements.
      </p>
    ),
  },
  {
    id: "q6",
    category: "Targeting",
    question: "How does country/location targeting work?",
    answer: (
      <p>
        You can restrict bars to specific countries by selecting ISO country codes (e.g. US, CA, UK, AU). Storefront visitor location is detected automatically using Shopify localization context.
      </p>
    ),
  },
  {
    id: "q7",
    category: "Scheduling",
    question: "How does campaign scheduling work?",
    answer: (
      <p>
        Specify an optional <strong>Start Date/Time</strong> and <strong>End Date/Time</strong>. The app automatically switches bars from <code>Scheduled</code> (pending start) to <code>Active</code> (live), and finally to <code>Expired</code> when the end date passes.
      </p>
    ),
  },
  {
    id: "q8",
    category: "Countdown Timers",
    question: "How do countdown timers work?",
    answer: (
      <p>
        When you enable the <strong>Countdown Timer</strong> feature and specify a target end date, a live, second-by-second countdown is displayed on your storefront bar to build urgency for flash sales and limited-time offers.
      </p>
    ),
  },
  {
    id: "q9",
    category: "Countdown Timers",
    question: "What happens when a countdown ends?",
    answer: (
      <p>
        When the timer reaches zero, if you configured a <strong>Replacement Message</strong> (e.g., "Flash sale has ended!"), the bar instantly swaps to that message. If no replacement message is set, the bar automatically hides from the storefront.
      </p>
    ),
  },
  {
    id: "q10",
    category: "Rotation & Multiple Bars",
    question: "How do multiple announcement bars rotate?",
    answer: (
      <div>
        <p>If multiple active bars match a storefront page, you can choose a <strong>Rotation Mode</strong>:</p>
        <ul>
          <li><strong>Static:</strong> Shows the top-priority announcement bar.</li>
          <li><strong>Carousel:</strong> Rotates between bars with slide or fade transitions at configurable durations (e.g. every 5 seconds).</li>
          <li><strong>Scrolling Text:</strong> Renders messages in a continuous marquee ticker animation.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "q11",
    category: "Cart Goal",
    question: "What is the cart goal / free-shipping progress bar?",
    answer: (
      <p>
        The Cart Goal bar tracks a spending threshold (e.g. $50 for Free Shipping). It integrates with Shopify's <code>/cart.js</code> AJAX API to dynamically recalculate the remaining balance (using the <code>{"{amount}"}</code> template variable) and updates to your custom "Goal Achieved" message when reached.
      </p>
    ),
  },
  {
    id: "q12",
    category: "Styling & CTA",
    question: "How do I customize colors, fonts, and content?",
    answer: (
      <p>
        The app offers full design customization: background color, linear gradients, text color, border width, border color, corner radius, Google Fonts selection, font sizes, text animation effects, and custom CSS overrides.
      </p>
    ),
  },
  {
    id: "q13",
    category: "Styling & CTA",
    question: "How do I add a CTA button?",
    answer: (
      <p>
        Enable the <strong>Call-To-Action (CTA) Button</strong> setting in the bar editor. Specify the button label (e.g., "Shop Sale"), destination URL, button background color, text color, and font size.
      </p>
    ),
  },
  {
    id: "q14",
    category: "Styling & CTA",
    question: "How does the dismiss ('×') button work?",
    answer: (
      <p>
        When the <strong>Close Button</strong> option is enabled, visitors can click the '×' icon to dismiss the bar. A browser session storage flag remembers their preference so the bar remains closed for the rest of their visit.
      </p>
    ),
  },
  {
    id: "q15",
    category: "Positioning",
    question: "How do I position the announcement bar?",
    answer: (
      <p>
        Choose between <strong>Top of page</strong> or <strong>Bottom of page</strong> positioning. You can also toggle <strong>Sticky</strong> behavior so the bar stays fixed to the screen during scrolling.
      </p>
    ),
  },
  {
    id: "q16",
    category: "Theme Extension",
    question: "How do I add the Theme App Extension to my theme?",
    answer: (
      <p>
        Go to <strong>Shopify Admin → Online Store → Themes → Customize</strong>. Click <strong>Add section</strong> (or Add block), select <strong>Apps → Announcement bar</strong>, and click <strong>Save</strong> in the top-right corner of the Theme Editor.
      </p>
    ),
  },
  {
    id: "q17",
    category: "Troubleshooting",
    question: "Why is my announcement bar not showing on my storefront?",
    answer: (
      <div>
        <p>Check the following 4 common points:</p>
        <ol>
          <li>Is the Announcement Bar app block added to your active theme in Shopify Theme Customizer?</li>
          <li>Is the bar switch set to <strong>Enabled</strong> in the app dashboard?</li>
          <li>Do your page, country, or schedule targeting rules match your current test page?</li>
          <li>Is your App Proxy functioning? (Open DevTools Network tab and verify requests to <code>/apps/announcement-bar/bars</code> return 200 OK).</li>
        </ol>
      </div>
    ),
  },
  {
    id: "q18",
    category: "Data & Uninstallation",
    question: "How does app uninstallation and data deletion work?",
    answer: (
      <p>
        Uninstalling the app cancels active subscriptions immediately. Store configurations are retained for up to 48 hours to handle accidental reinstalls, after which Shopify's <code>shop/redact</code> privacy webhook permanently wipes all shop data from our database.
      </p>
    ),
  },
];

export default function FAQPublic() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = ["All", "General", "Bar Management", "Targeting", "Scheduling", "Countdown Timers", "Rotation & Multiple Bars", "Cart Goal", "Styling & CTA", "Positioning", "Theme Extension", "Troubleshooting", "Data & Uninstallation"];

  const filteredItems = FAQ_ITEMS.filter((item) => {
    const matchesCat = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch =
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <PublicPageLayout
      title="Frequently Asked Questions"
      subtitle="Find fast answers to common questions about setting up, targeting, styling, and managing your announcement bars."
      badge="Merchant Knowledge Base"
      activeTab="faq"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .faq-filter-bar {
          background: #ffffff;
          border: 1px solid #e3e3e3;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 28px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }

        .search-box {
          margin-bottom: 16px;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #c9cccf;
          border-radius: 8px;
          font-size: 15px;
          box-sizing: border-box;
          outline: none;
        }

        .search-input:focus {
          border-color: #1a1a1a;
        }

        .category-pills {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .cat-pill {
          background: #f1f2f3;
          border: 1px solid #e3e3e3;
          padding: 6px 14px;
          border-radius: 16px;
          font-size: 13px;
          font-weight: 500;
          color: #6d7175;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .cat-pill:hover {
          background: #e4e5e7;
          color: #202223;
        }

        .cat-pill.active {
          background: #1a1a1a;
          color: #ffffff;
          border-color: #1a1a1a;
        }

        .faq-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .faq-item-card {
          background: #ffffff;
          border: 1px solid #e3e3e3;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        }

        .faq-item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 12px;
        }

        .faq-question {
          font-size: 17px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0;
        }

        .faq-cat-badge {
          background: #f1f2f3;
          color: #6d7175;
          font-size: 12px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 10px;
          white-space: nowrap;
        }

        .faq-answer {
          font-size: 14px;
          line-height: 1.6;
          color: #303030;
          margin: 0;
        }

        .faq-answer ul, .faq-answer ol {
          padding-left: 20px;
          margin-top: 8px;
          margin-bottom: 8px;
        }

        .empty-results {
          background: #ffffff;
          border: 1px dashed #c9cccf;
          border-radius: 12px;
          padding: 40px;
          text-align: center;
          color: #6d7175;
        }
      `,
        }}
      />

      <div className="faq-filter-bar">
        <div className="search-box">
          <input
            type="text"
            className="search-input"
            placeholder="Search questions by topic (e.g. countdown, targeting, theme extension)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="category-pills">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`cat-pill ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="faq-grid">
        {filteredItems.length === 0 ? (
          <div className="empty-results">
            <h3>No questions found matching "{searchTerm}"</h3>
            <p>Try searching for a different keyword or check the full Documentation guide.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div className="faq-item-card" key={item.id}>
              <div className="faq-item-header">
                <h3 className="faq-question">{item.question}</h3>
                <span className="faq-cat-badge">{item.category}</span>
              </div>
              <div className="faq-answer">{item.answer}</div>
            </div>
          ))
        )}
      </div>
    </PublicPageLayout>
  );
}
