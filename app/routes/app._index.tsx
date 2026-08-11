import { useEffect, useRef, useState } from "react";

import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate, useSearchParams, useSubmit } from "react-router";
import { authenticate } from "../shopify.server";
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  reorderAnnouncements,
  toggleAnnouncement,
  getDashboardStats,
} from "../models/announcement.server";
import {
  deserializeCountries,
  deserializePages,
  getCampaignStatus,
  type CampaignStatus,
} from "../models/announcement.shared";

type Announcement = Awaited<ReturnType<typeof listAnnouncements>>[number];

const PAGE_LABELS: Record<string, string> = {
  home: "Home",
  collection: "Collections",
  product: "Products",
  cart: "Cart",
  custom: "Custom page",
};

function pageSummary(displayPages: string) {
  const pages = deserializePages(displayPages);
  if (pages === "all") return "All pages";
  if (pages.length === 0) return "No pages selected";
  return pages.map((p) => PAGE_LABELS[p] ?? p).join(", ");
}

function locationSummary(countries: string) {
  const list = deserializeCountries(countries);
  if (list === "all") return "All locations";
  if (list.length === 1) return list[0];
  return `${list.length} countries`;
}

const RANGE_TO_DAYS: Record<string, number | undefined> = {
  "7": 7,
  "30": 30,
  "90": 90,
  all: undefined,
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const range = url.searchParams.get("range") || "30";
  const startDate = url.searchParams.get("startDate") || "";
  const endDate = url.searchParams.get("endDate") || "";

  let stats;
  if (range === "custom") {
    stats = await getDashboardStats(session.shop, startDate, endDate);
  } else {
    const days = RANGE_TO_DAYS[range];
    stats = await getDashboardStats(session.shop, days);
  }

  const announcements = await listAnnouncements(session.shop);
  return { announcements, stats, range, startDate, endDate };
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "toggle") {
    const id = String(formData.get("id"));
    const enabled = formData.get("enabled") === "true";
    await toggleAnnouncement(session.shop, id, enabled);
    return { ok: true };
  }

  if (intent === "delete") {
    const id = String(formData.get("id"));
    await deleteAnnouncement(session.shop, id);
    return { ok: true };
  }

  if (intent === "duplicate") {
    const id = String(formData.get("id"));
    const announcements = await listAnnouncements(session.shop);
    const source = announcements.find((a) => a.id === id);
    if (source) {
      await createAnnouncement(session.shop, {
        name: `${source.name} (copy)`,
        message: source.message,
        enabled: false,
        displayPages: deserializePages(source.displayPages),
        customPageUrl: source.customPageUrl,
        countries: deserializeCountries(source.countries),
        linkUrl: source.linkUrl,
        linkText: source.linkText,
        backgroundColor: source.backgroundColor,
        textColor: source.textColor,
        rotationMode: source.rotationMode as "static" | "carousel" | "scroll",
        startAt: source.startAt?.toISOString() ?? null,
        endAt: source.endAt?.toISOString() ?? null,
        countdownEnabled: source.countdownEnabled,
        countdownEndAt: source.countdownEndAt?.toISOString() ?? null,
        countdownExpiredMessage: source.countdownExpiredMessage,
        cartGoalEnabled: source.cartGoalEnabled,
        cartGoalAmount: source.cartGoalAmount,
        cartGoalMessage: source.cartGoalMessage,
        cartGoalAchievedMessage: source.cartGoalAchievedMessage,
        bgStyle: source.bgStyle,
        bgGradient: source.bgGradient,
        bgAnimation: source.bgAnimation,
        borderRadius: source.borderRadius,
        borderSize: source.borderSize,
        borderColor: source.borderColor,
        fontFamily: source.fontFamily,
        fontSize: source.fontSize,
        fontBold: source.fontBold,
        textAnimation: source.textAnimation,
        customCss: source.customCss,
        barType: source.barType,
        slideDuration: source.slideDuration,
        showCloseButton: source.showCloseButton,
        position: source.position,
        sticky: source.sticky,
        customerTargetingType: source.customerTargetingType,
        customerTargetingTags: source.customerTargetingTags,
        customerTargetingSpend: source.customerTargetingSpend,
        slidesJson: source.slidesJson || "",
        sliderShowArrows: source.sliderShowArrows,
        sliderArrowsPosition: source.sliderArrowsPosition,
        timezone: source.timezone || "UTC",
        subtextFontSize: source.subtextFontSize,
        subtextColor: source.subtextColor,
        subtextBold: source.subtextBold,
        buttonFontSize: source.buttonFontSize,
        buttonTextColor: source.buttonTextColor,
        buttonBold: source.buttonBold,
        buttonBgColor: source.buttonBgColor,
        timerPosition: source.timerPosition,
        timerFontSize: source.timerFontSize,
        timerWidth: source.timerWidth,
        timerHeight: source.timerHeight,
        timerTextColor: source.timerTextColor,
        timerBgColor: source.timerBgColor,
        paddingTop: source.paddingTop,
        paddingBottom: source.paddingBottom,
        marginTop: source.marginTop,
        marginBottom: source.marginBottom,
        htmlContent: source.htmlContent || "",
      });
    }
    return { ok: true };
  }

  if (intent === "reorder") {
    const orderedIds = String(formData.get("orderedIds")).split(",").filter(Boolean);
    await reorderAnnouncements(session.shop, orderedIds);
    return { ok: true };
  }

  return { ok: false };
}

export default function Index() {
  const { announcements, stats, range, startDate, endDate } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const submit = useSubmit();
  const [searchParams, setSearchParams] = useSearchParams();

  const todayStr = new Date().toISOString().split("T")[0];
  const [customStartDate, setCustomStartDate] = useState(startDate || todayStr);
  const [customEndDate, setCustomEndDate] = useState(endDate || todayStr);

  const handleRangeChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "custom") {
      next.set("range", "custom");
      next.set("startDate", customStartDate);
      next.set("endDate", customEndDate);
    } else {
      next.set("range", value);
      next.delete("startDate");
      next.delete("endDate");
    }
    setSearchParams(next);
  };

  const handleApplyCustomDates = () => {
    const next = new URLSearchParams(searchParams);
    next.set("range", "custom");
    next.set("startDate", customStartDate);
    next.set("endDate", customEndDate);
    setSearchParams(next);
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const goToNew = (e?: { preventDefault?: () => void }) => {
    e?.preventDefault?.();
    navigate("/app/announcements/new");
  };

  const toggle = (id: string, enabled: boolean) => {
    submit({ intent: "toggle", id, enabled: String(enabled) }, { method: "post" });
  };

  const duplicate = (id: string) => {
    submit({ intent: "duplicate", id }, { method: "post" });
    setActiveDropdown(null);
  };

  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = deleteDialogRef.current;
    if (!dialog) return;
    if (pendingDelete && !dialog.open) {
      dialog.showModal();
    } else if (!pendingDelete && dialog.open) {
      dialog.close();
    }
  }, [pendingDelete]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (activeDropdown && !(e.target as Element).closest(".actions-cell")) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [activeDropdown]);

  const remove = (id: string, name: string) => {
    setPendingDelete({ id, name });
    setActiveDropdown(null);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    submit({ intent: "delete", id: pendingDelete.id }, { method: "post" });
    setPendingDelete(null);
  };

  const statuses = announcements.map((a: Announcement) => getCampaignStatus(a));
  const activeCount = statuses.filter((s) => s === "active").length;

  // Analytics stats come directly from the database (getDashboardStats).
  // When no analytics data exists, getDashboardStats already returns 0 for all values.
  const displayStats = stats;

  // Filter announcements by search query
  const filteredAnnouncements = announcements.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="dashboard-wrapper">
      <style dangerouslySetInnerHTML={{ __html: `
        .dashboard-wrapper {
          padding: 32px;
          margin:20px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #202223;
          background-color: #f6f6f7;
          min-height: 100vh;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
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

        .btn-primary {
          background-color: #1a1a1a;
          color: #ffffff;
          border: none;
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          transition: background-color 0.2s ease, transform 0.1s ease;
        }

        .btn-primary:hover {
          background-color: #333333;
        }

        .btn-primary:active {
          transform: scale(0.98);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 28px;
        }

        .stat-card {
          background: #ffffff;
          border: 1px solid #e3e3e3;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .stat-card-title {
          font-size: 14px;
          color: #6d7175;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .stat-card-value {
          font-size: 26px;
          font-weight: 700;
          color: #202223;
          display: flex;
          align-items: center;
          gap: 8px;
        }
          .btn-action-icon span {
    width: 100%;
    max-width: 20px;
}

        .stat-icon {
          font-size: 18px;
          line-height: 1;
          width:100%;
          max-width:25px;
        }

        .usage-text {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: #202223;
          margin-bottom: 8px;
        }

        .progress-track {
          width: 100%;
          height: 6px;
          background-color: #f1f2f3;
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background-color: #1a1a1a;
          border-radius: 3px;
        }

        .main-card {
          background: #ffffff;
          border: 1px solid #e3e3e3;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          padding: 20px;
        }

        .search-container {
          position: relative;
          margin-bottom: 20px;
        }

        .search-input {
          width: 100%;
          padding: 10px 16px 10px 42px;
          border: 1px solid #c9cccf;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          border-color: #1a1a1a;
        }

        .search-icon-svg {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #6d7175;
          pointer-events: none;
          width: 18px;
          height: 18px;
        }

        .table-responsive {
          overflow-x: auto;
        }

        .announcements-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .announcements-table th {
          padding: 12px 16px;
          font-size: 13px;
          font-weight: 600;
          color: #6d7175;
          border-bottom: 1px solid #e3e3e3;
        }

        .announcements-table td {
          padding: 16px;
          font-size: 14px;
          border-bottom: 1px solid #f1f1f1;
          color: #202223;
          vertical-align: middle;
        }

        .announcements-table tr:last-child td {
          border-bottom: none;
        }

        .announcement-name {
          font-weight: 500;
          color: #1a1a1a;
          margin-bottom: 4px;
        }

        .announcement-subtitle {
          font-size: 12px;
          color: #6d7175;
        }

        /* Status Pills */
        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          line-height: 1.2;
        }

        .status-live {
          background-color: #e6f4ea;
          color: #137333;
        }

        .status-paused {
          background-color: #f1f3f4;
          color: #5f6368;
        }

        .status-scheduled {
          background-color: #e8f0fe;
          color: #1a73e8;
        }

        .status-expired {
          background-color: #fce8e6;
          color: #c5221f;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          display: inline-block;
        }

        .status-live .status-dot { background-color: #137333; }
        .status-paused .status-dot { background-color: #5f6368; }
        .status-scheduled .status-dot { background-color: #1a73e8; }
        .status-expired .status-dot { background-color: #c5221f; }

        .actions-cell {
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
        }

        .btn-action-icon {
          border: 1px solid #e3e3e3;
          background: #ffffff;
          border-radius: 6px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #6d7175;
          transition: background-color 0.15s, border-color 0.15s, color 0.15s;
          padding: 0;
        }

        .btn-action-icon:hover {
          background-color: #f6f6f7;
          border-color: #c9cccf;
          color: #202223;
        }

        .actions-dropdown-menu {
          position: absolute;
          right: 0;
          top: 36px;
          background: #ffffff;
          border: 1px solid #e3e3e3;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          z-index: 100;
          min-width: 130px;
          padding: 4px 0;
          display: flex;
          flex-direction: column;
        }

        .dropdown-item {
          background: none;
          border: none;
          padding: 8px 16px;
          text-align: left;
          font-size: 13px;
          color: #202223;
          cursor: pointer;
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .dropdown-item:hover {
          background-color: #f6f6f7;
        }

        .dropdown-item.item-delete {
          color: #d32f2f;
        }

        .dropdown-item.item-delete:hover {
          background-color: #ffebee;
        }

        .empty-state {
          padding: 48px;
          text-align: center;
          background: #ffffff;
          border: 1px solid #e3e3e3;
          border-radius: 12px;
        }

        .empty-state h3 {
          font-size: 18px;
          margin-bottom: 8px;
          color: #202223;
        }

        .empty-state p {
          font-size: 14px;
          color: #6d7175;
          margin-bottom: 20px;
        }

        dialog::backdrop {
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(2px);
        }
      `}} />

      <div className="dashboard-header">
        <div className="header-title-section">
          <h1>Dashboard</h1>
          <p>Manage your store announcements and track their performance</p>
        </div>
        <button className="btn-primary" onClick={goToNew}>
          <s-icon type="plus" />
          Create Announcement
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: "#202223" }}>
          Analytics
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {range === "custom" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: "#6d7175" }}>From:</span>
              <s-date-field
                label=""
                placeholder="Select date"
                value={customStartDate}
                onChange={(e: any) => setCustomStartDate(e.target.value)}
                style={{ width: "130px" }}
              />
              <span style={{ fontSize: 13, color: "#6d7175" }}>To:</span>
              <s-date-field
                label=""
                placeholder="Select date"
                value={customEndDate}
                onChange={(e: any) => setCustomEndDate(e.target.value)}
                style={{ width: "130px" }}
              />
              <button
                type="button"
                onClick={handleApplyCustomDates}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  background: "#1a1a1a",
                  color: "#ffffff",
                  border: "none",
                  fontSize: 13,
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                Apply
              </button>
            </div>
          )}
          <select
            className="analytics-range-select"
            value={range}
            onChange={(e) => handleRangeChange(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #c9cccf",
              fontSize: 13,
              background: "#ffffff",
              color: "#202223",
            }}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
            <option value="custom">Custom Date Range</option>
          </select>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-title">
            <span>Active announcements</span>
            <span className="stat-icon"><s-icon type="megaphone" /></span>
          </div>
          <div className="stat-card-value">
            {activeCount}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-title">
            <span>Views</span>
            <span className="stat-icon"><s-icon type="view" /></span>
          </div>
          <div className="stat-card-value">
            {displayStats.totalViews.toLocaleString()}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-title">
            <span>Clicks</span>
            <span className="stat-icon"><s-icon type="cursor" /></span>
          </div>
          <div className="stat-card-value">
            {displayStats.totalClicks.toLocaleString()}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-title">
            <span>Usage</span>
            <span style={{ fontSize: 12, color: "#6d7175" }}>Monthly views</span>
          </div>
          <div>
            <div className="usage-text">
              <span>Views</span>
              <strong>{displayStats.monthlyViews.toLocaleString()} / 2,000</strong>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${Math.min(100, (displayStats.monthlyViews / 2000) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="main-card">
        {announcements.length === 0 ? (
          <div className="empty-state">
            <h3>No announcements yet</h3>
            <p>Create your first bar to show a message, run a flash-sale countdown, or track a cart goal on your storefront.</p>
            <button className="btn-primary" onClick={goToNew}>
              <s-icon type="plus" />
              Create announcement
            </button>
          </div>
        ) : (
          <>
            <div className="search-container">
              <input
                type="text"
                className="search-input"
                placeholder="Search announcement"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="search-icon-svg">
                <s-icon type="search" />
              </span>
            </div>

            <div className="table-responsive">
              <table className="announcements-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Views</th>
                    <th>Created on</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAnnouncements.map((a: Announcement) => {
                    const status = getCampaignStatus(a);
                    
                    // Views calculations per announcement from real analytics data
                    const announcementViews = (a.analytics || []).reduce((sum, item) => sum + item.views, 0);

                    const createdDate = new Date(a.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "numeric",
                      day: "numeric"
                    });

                    return (
                      <tr key={a.id}>
                        <td>
                          <div className="announcement-name">{a.name}</div>
                          <div className="announcement-subtitle">
                            {pageSummary(a.displayPages)} · {locationSummary(a.countries)}
                          </div>
                        </td>
                        <td>
                          {status === "active" && (
                            <span className="status-pill status-live">
                              <span className="status-dot"></span>Live
                            </span>
                          )}
                          {status === "draft" && (
                            <span className="status-pill status-paused">
                              <span className="status-dot"></span>Draft
                            </span>
                          )}
                          {status === "scheduled" && (
                            <span className="status-pill status-scheduled">
                              <span className="status-dot"></span>Scheduled
                            </span>
                          )}
                          {status === "expired" && (
                            <span className="status-pill status-expired">
                              <span className="status-dot"></span>Expired
                            </span>
                          )}
                        </td>
                        <td style={{ fontWeight: 500 }}>
                          {announcementViews}
                        </td>
                        <td style={{ color: "#6d7175" }}>
                          {createdDate}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div className="actions-cell" style={{ justifyContent: "flex-end" }}>
                            {/* Play/Pause Toggle button */}
                            <button
                              className="btn-action-icon"
                              title={a.enabled ? "Pause" : "Play"}
                              onClick={() => toggle(a.id, !a.enabled)}
                            >
                              <s-icon type={a.enabled ? "pause-circle" : "play-circle"} />
                            </button>

                            {/* Edit Button */}
                            <button
                              className="btn-action-icon"
                              title="Edit"
                              onClick={() => navigate(`/app/announcements/${a.id}`)}
                            >
                              <s-icon type="edit" />
                            </button>

                            {/* More Actions Trigger */}
                            <button
                              className="btn-action-icon"
                              title="More options"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdown(activeDropdown === a.id ? null : a.id);
                              }}
                            >
                              <s-icon type="menu-horizontal" />
                            </button>

                            {/* More Actions Dropdown Menu */}
                            {activeDropdown === a.id && (
                              <div className="actions-dropdown-menu">
                                <button className="dropdown-item" onClick={() => duplicate(a.id)}>
                                  <s-icon type="duplicate" /> Duplicate
                                </button>
                                <button className="dropdown-item item-delete" onClick={() => remove(a.id, a.name)}>
                                  <s-icon type="delete" tone="critical" /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <dialog
        ref={deleteDialogRef}
        onClose={() => setPendingDelete(null)}
        onCancel={() => setPendingDelete(null)}
        style={{
          padding: 0,
          border: "none",
          borderRadius: 12,
          width: "min(480px, 92vw)",
          boxShadow: "0 12px 32px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: "1px solid #e3e3e3",
            }}
          >
            <strong style={{ fontSize: 15 }}>Remove announcement</strong>
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              aria-label="Close"
              style={{
                border: "none",
                background: "transparent",
                fontSize: 18,
                lineHeight: 1,
                cursor: "pointer",
                color: "#6d7175",
                padding: 4,
              }}
            >
              ×
            </button>
          </div>

          <div style={{ padding: "20px" }}>
            <span>
              Are you sure that you want to remove the announcement &quot;
              {pendingDelete?.name}&quot;?
            </span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              padding: "12px 20px",
              borderTop: "1px solid #e3e3e3",
            }}
          >
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid #c9cccf",
                background: "#fff",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                background: "#d82c0d",
                color: "#fff",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Remove
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}