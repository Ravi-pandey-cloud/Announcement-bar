import React, { useState } from "react";
import type { MetaFunction } from "react-router";
import { PublicPageLayout } from "../components/PublicPageLayout";

export const meta: MetaFunction = () => {
  return [
    { title: "Frequently Asked Questions | Announcement Bar Pro" },
    {
      name: "description",
      content: "Find quick answers to common questions about Announcement Bar Pro.",
    },
  ];
};

interface FAQItem {
  id: string;
  question: string;
  answer: React.ReactNode;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: "q1",
    question: "What is Announcement Bar Pro?",
    answer: (
      <p>
        Announcement Bar Pro is a Shopify app that helps you create fully customizable header and footer announcement bars for your store. You can use it to promote sales, display countdown timers, show free-shipping goals, and rotate multiple messages to boost conversions.
      </p>
    ),
  },
  {
    id: "q2",
    question: "How do I install the app?",
    answer: (
      <p>
        You can install the app through the Shopify App Store. Once installed, navigate to your Shopify Theme Editor, add the Announcement Bar app block to your header or theme layout, and save the changes.
      </p>
    ),
  },
  {
    id: "q3",
    question: "How do I create an announcement bar?",
    answer: (
      <p>
        In the app dashboard, click <strong>Create Announcement</strong>, enter your message text, customize your colors and fonts, configure any optional targeting or scheduling rules, and click <strong>Save</strong>.
      </p>
    ),
  },
  {
    id: "q4",
    question: "Can I customize the appearance?",
    answer: (
      <p>
        Yes. You can customize the background colors, text colors, borders, font styles, sizes, and layout options to match your store's brand perfectly.
      </p>
    ),
  },
  {
    id: "q5",
    question: "Can I target specific pages or customers?",
    answer: (
      <p>
        Yes. You can choose where your bar appears, such as all pages, the home page only, specific collections, products, or the cart page. You can also restrict bars to visitors from specific countries.
      </p>
    ),
  },
  {
    id: "q6",
    question: "Can I schedule an announcement?",
    answer: (
      <p>
        Yes. You can set a start and end date/time for your announcement bars to automate sales and promotions in advance.
      </p>
    ),
  },
  {
    id: "q7",
    question: "Can I use multiple announcement bars?",
    answer: (
      <p>
        Yes. You can create multiple bars and rotate them automatically using a carousel transition or a scrolling marquee text effect.
      </p>
    ),
  },
  {
    id: "q8",
    question: "Can I add a countdown timer?",
    answer: (
      <p>
        Yes. You can enable a countdown timer on any bar to build urgency for limited-time offers or flash sales.
      </p>
    ),
  },
  {
    id: "q9",
    question: "How does the free-shipping goal work?",
    answer: (
      <p>
        You can set a target order amount (for example, $50) for free shipping. The app automatically tracks the customer's cart value and updates the announcement bar dynamically to show how much more they need to spend to qualify.
      </p>
    ),
  },
  {
    id: "q10",
    question: "Can I preview my announcement?",
    answer: (
      <p>
        Yes. The app dashboard features a live preview editor that shows you exactly how your announcement bar will look before publishing it to your store.
      </p>
    ),
  },
  {
    id: "q11",
    question: "How do I disable an announcement?",
    answer: (
      <p>
        You can disable any active announcement bar by toggling the status switch off in the app dashboard.
      </p>
    ),
  },
  {
    id: "q12",
    question: "What happens if I uninstall the app?",
    answer: (
      <p>
        If you uninstall the app, all active bars will stop showing on your storefront, and your subscription will be canceled. Your settings are saved for 48 hours in case you reinstall, after which they are permanently deleted.
      </p>
    ),
  },
  {
    id: "q13",
    question: "How can I get support?",
    answer: (
      <p>
        You can contact our support team directly through the Shopify Partner Dashboard App Support channel or email us at <strong>support@announcementbarpro.com</strong>. We aim to reply to all inquiries within 24 business hours.
      </p>
    ),
  },
];

export default function FAQPublic() {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <PublicPageLayout
      title="Frequently Asked Questions"
      subtitle="Find quick answers to common questions about Announcement Bar Pro."
      activeTab="faq"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .faq-container {
          max-width: 800px;
          margin: 0 auto;
        }

        .faq-accordion-item {
          background: #ffffff;
          border: 1px solid #e3e3e3;
          border-radius: 8px;
          margin-bottom: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
          transition: border-color 0.15s ease;
        }

        .faq-accordion-item:hover {
          border-color: #c9cccf;
        }

        .faq-accordion-trigger {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 24px;
          background: none;
          border: none;
          text-align: left;
          font-size: 16px;
          font-weight: 600;
          color: #1a1a1a;
          cursor: pointer;
          outline: none;
        }

        .faq-accordion-trigger:focus-visible {
          outline: 2px solid #1a1a1a;
        }

        .faq-accordion-icon {
          font-size: 20px;
          font-weight: 400;
          color: #6d7175;
          transition: transform 0.2s ease;
          user-select: none;
        }

        .faq-accordion-item.open .faq-accordion-icon {
          transform: rotate(45deg);
        }

        .faq-accordion-content {
          padding: 0 24px 18px 24px;
          font-size: 14px;
          line-height: 1.6;
          color: #4a4d51;
          border-top: 1px solid transparent;
        }

        .faq-accordion-item.open .faq-accordion-content {
          border-top-color: #f1f2f3;
        }

        .faq-accordion-content p {
          margin: 0 0 12px 0;
        }

        .faq-accordion-content p:last-child {
          margin-bottom: 0;
        }
      `,
        }}
      />

      <div className="faq-container">
        {FAQ_ITEMS.map((item) => {
          const isOpen = openId === item.id;
          return (
            <div
              key={item.id}
              className={`faq-accordion-item ${isOpen ? "open" : ""}`}
            >
              <button
                className="faq-accordion-trigger"
                onClick={() => toggleItem(item.id)}
                aria-expanded={isOpen}
              >
                <span>{item.question}</span>
                <span className="faq-accordion-icon">+</span>
              </button>
              {isOpen && (
                <div className="faq-accordion-content">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PublicPageLayout>
  );
}
