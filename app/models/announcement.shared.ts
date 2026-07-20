// Pure helpers and types shared between server routes/loaders and the
// client-rendered components. This file must NOT import prisma or do any
// I/O — anything server-only belongs in announcement.server.ts instead.
// (React Router strips *.server.ts files from the client bundle, so any
// function a component calls during render has to live outside that file.)

export type DisplayPage = "home" | "collection" | "product" | "cart" | "custom";

export type CampaignStatus = "draft" | "scheduled" | "active" | "expired";

export interface SlideData {
  id: string;
  text: string;
  subtext: string;
  discountCodeEnabled: boolean;
  discountCode: string;
  discountPlaceInText: boolean;
  countdownEnabled: boolean;
  countdownType: "session" | "date";
  countdownMinutes: number;
  countdownEndAt?: string | null;
  countdownExpiredAction: "hide_slide" | "hide_bar" | "show_message" | "do_nothing";
  countdownExpiredMessage?: string | null;
  countdownLabelsDays: string;
  countdownLabelsHours: string;
  countdownLabelsMins: string;
  countdownLabelsSecs: string;
  countdownLabel?: string | null;
  countdownHideDaysIfLessThan24h: boolean;
  countdownPlaceInText: boolean;
  ctaEnabled: boolean;
  ctaType: "button" | "full_bar";
  ctaText: string;
  ctaLink: string;
  iconEnabled: boolean;
  iconType: "icon" | "badge";
  iconName: string;
}

export interface AnnouncementInput {
  name: string;
  message: string;
  enabled: boolean;
  displayPages: DisplayPage[] | "all";
  customPageUrl?: string | null;
  countries: string[] | "all";
  linkUrl?: string | null;
  linkText?: string | null;
  backgroundColor: string;
  textColor: string;
  rotationMode: "static" | "carousel" | "scroll";
  bgStyle: string;
  bgGradient?: string | null;
  bgAnimation: string;
  borderRadius: number;
  borderSize: number;
  borderColor: string;
  fontFamily: string;
  fontSize: number;
  fontBold: boolean;
  textAnimation: string;
  customCss?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  countdownEnabled: boolean;
  countdownEndAt?: string | null;
  countdownExpiredMessage?: string | null;
  cartGoalEnabled: boolean;
  cartGoalAmount?: number | null;
  cartGoalMessage?: string | null;
  cartGoalAchievedMessage?: string | null;
subtextFontSize: number;
subtextColor: string;
subtextBold: boolean;
buttonFontSize: number;
buttonTextColor: string;
buttonBold: boolean;
buttonBgColor: string;
timerPosition: string;
timerFontSize: number;
timerWidth: string;
timerHeight: string;
timerTextColor: string;
timerBgColor: string;
paddingTop: number;
paddingBottom: number;
marginTop: number;
marginBottom: number;
htmlContent: string;

  // Sleek features
  barType: string;
  slideDuration: number;
  showCloseButton: boolean;
  position: string;
  sticky: boolean;
  customerTargetingType: string;
  customerTargetingTags: string;
  customerTargetingSpend: number;
  slidesJson: string;
  sliderShowArrows: boolean;
  sliderArrowsPosition: string;
  timezone: string;
}

export function serializePages(pages: DisplayPage[] | "all") {
  if (pages === "all" || pages.length === 0) return "all";
  return pages.join(",");
}

export function deserializePages(displayPages: string): DisplayPage[] | "all" {
  if (displayPages === "all") return "all";
  return displayPages.split(",").filter(Boolean) as DisplayPage[];
}

export function serializeCountries(countries: string[] | "all") {
  if (countries === "all" || countries.length === 0) return "all";
  return countries.join(",");
}

export function deserializeCountries(countries: string): string[] | "all" {
  if (!countries || countries === "all") return "all";
  return countries.split(",").filter(Boolean);
}

/**
 * Derives a human-friendly campaign status from the enabled flag and the
 * scheduling window. Used by the dashboard to show Draft / Scheduled /
 * Active / Expired badges, independent of whether the merchant has also
 * flipped the manual enabled switch off.
 */
export function getCampaignStatus(a: {
  enabled: boolean;
  startAt: Date | null;
  endAt: Date | null;
}): CampaignStatus {
  if (!a.enabled) return "draft";
  const now = new Date();
  if (a.endAt && a.endAt < now) return "expired";
  if (a.startAt && a.startAt > now) return "scheduled";
  return "active";
}

/**
 * Converts a local datetime-local string (e.g. "2026-07-09T18:00") and a timezone
 * (e.g. "America/New_York") into a UTC Date object.
 */
export function localToUtc(localStr: string, timeZone: string): Date {
  const utcDate = new Date(localStr + "Z");
  try {
    // Format the UTC date in the target timezone:
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });
    
    const parts = formatter.formatToParts(utcDate);
    const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));
    
    // Construct target local date using parts:
    // Year, Month (1-12), Day, Hour, Minute, Second
    const year = parseInt(partMap.year);
    const month = parseInt(partMap.month) - 1;
    const day = parseInt(partMap.day);
    const hour = parseInt(partMap.hour);
    const minute = parseInt(partMap.minute);
    const second = parseInt(partMap.second || "0");
    
    const tzDate = Date.UTC(year, month, day, hour, minute, second);
    const diff = utcDate.getTime() - tzDate;
    
    return new Date(utcDate.getTime() + diff);
  } catch (e) {
    // Fallback if timezone is invalid or unsupported
    return new Date(localStr);
  }
}

/**
 * Converts a UTC Date object back into a datetime-local input string format
 * (YYYY-MM-DDTHH:mm) for a specific timezone.
 */
export function utcToLocal(utcDate: Date, timeZone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("sv-SE", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const formatted = formatter.format(utcDate); // "YYYY-MM-DD HH:mm:ss"
    return formatted.replace(" ", "T").substring(0, 16);
  } catch (e) {
    // Fallback if timezone is invalid or unsupported
    return utcDate.toISOString().slice(0, 16);
  }
}

