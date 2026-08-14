import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { listAnnouncements, trackViews, trackClick } from "../models/announcement.server";
import { deserializeCountries, deserializePages, getCampaignStatus } from "../models/announcement.shared";

function matchesPage(
  displayPages: string,
  customPageUrl: string | null,
  pageType: string,
  url: string,
) {
  const pages = deserializePages(displayPages);
  if (pages === "all") return true;

  if (pages.includes("home") && pageType === "index") return true;
  if (pages.includes("collection") && pageType === "collection") return true;
  if (pages.includes("product") && pageType === "product") return true;
  if (pages.includes("cart") && pageType === "cart") return true;
  if (pages.includes("custom") && pageType === "page") {
    if (!customPageUrl) return true;
    return url === customPageUrl;
  }
  return false;
}

function matchesCountry(countries: string, requestCountry: string) {
  const list = deserializeCountries(countries);
  if (list === "all") return true;
  if (!requestCountry) return false;
  return list.includes(requestCountry.toUpperCase());
}

function matchesCustomer(
  targetingType: string,
  targetingTags: string,
  targetingSpend: number,
  customerTagsStr: string,
  customerSpend: number,
) {
  if (targetingType === "all") return true;
  if (targetingType === "tags") {
    if (!targetingTags) return true;
    const requiredTags = targetingTags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    if (requiredTags.length === 0) return true;
    const customerTags = customerTagsStr.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    return requiredTags.some((tag) => customerTags.includes(tag));
  }
  if (targetingType === "spend") {
    return customerSpend >= targetingSpend;
  }
  return true;
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { session } = await authenticate.public.appProxy(request);
    if (!session) {
      return Response.json({ ok: false }, { status: 401 });
    }

    const formData = await request.formData();
    const intent = formData.get("intent");
    if (intent === "click") {
      const id = String(formData.get("id"));
      if (id) {
        await trackClick(id);
        return Response.json({ ok: true });
      }
    }

    return Response.json({ ok: false }, { status: 400 });
  } catch (error) {
    console.error("[AppProxy] Action error:", error);
    return Response.json({ ok: false, error: "Invalid proxy request" }, { status: 400 });
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { session } = await authenticate.public.appProxy(request);

    if (!session) {
      return Response.json({ announcements: [] });
    }

    const url = new URL(request.url);
    const pageType = url.searchParams.get("page_type") || "";
    const pagePath = url.searchParams.get("url") || "";
    const country = url.searchParams.get("country") || "";
    const customerTagsStr = url.searchParams.get("customer_tags") || "";
    const customerSpend = Number(url.searchParams.get("customer_spend") || "0");

    const all = await listAnnouncements(session.shop);
    const now = new Date();

    const active = all
      .filter((a) => getCampaignStatus(a) === "active")
      .filter((a) => {
        // Skip bars whose countdown already expired and have no expiry message,
        // since they'd render nothing useful.
        if (a.countdownEnabled && a.countdownEndAt && a.countdownEndAt < now) {
          return Boolean(a.countdownExpiredMessage);
        }
        return true;
      })
      .filter((a) => matchesPage(a.displayPages, a.customPageUrl, pageType, pagePath))
      .filter((a) => matchesCountry(a.countries, country))
      .filter((a) => matchesCustomer(a.customerTargetingType, a.customerTargetingTags, a.customerTargetingSpend, customerTagsStr, customerSpend))
      .map((a) => ({
        id: a.id,
        message: a.message,
        linkUrl: a.linkUrl,
        linkText: a.linkText,
        backgroundColor: a.backgroundColor,
        textColor: a.textColor,
        rotationMode: a.rotationMode,
        bgStyle: a.bgStyle,
        bgGradient: a.bgGradient,
        bgAnimation: a.bgAnimation,
        borderRadius: a.borderRadius,
        borderSize: a.borderSize,
        borderColor: a.borderColor,
        fontFamily: a.fontFamily,
        fontSize: a.fontSize,
        fontBold: a.fontBold,
        textAnimation: a.textAnimation,
        customCss: a.customCss,
        countdownEnabled: a.countdownEnabled,
        countdownEndAt: a.countdownEndAt,
        countdownExpiredMessage: a.countdownExpiredMessage,
        cartGoalEnabled: a.cartGoalEnabled,
        cartGoalAmount: a.cartGoalAmount,
        cartGoalMessage: a.cartGoalMessage,
        cartGoalAchievedMessage: a.cartGoalAchievedMessage,
        subtextFontSize: a.subtextFontSize,
        subtextColor: a.subtextColor,
        subtextBold: a.subtextBold,
        buttonFontSize: a.buttonFontSize,
        buttonTextColor: a.buttonTextColor,
        buttonBold: a.buttonBold,
        buttonBgColor: a.buttonBgColor,
        timerPosition: a.timerPosition,
        timerFontSize: a.timerFontSize,
        timerWidth: a.timerWidth,
        timerHeight: a.timerHeight,
        timerTextColor: a.timerTextColor,
        timerBgColor: a.timerBgColor,
        paddingTop: a.paddingTop,
        paddingBottom: a.paddingBottom,
        marginTop: a.marginTop,
        marginBottom: a.marginBottom,
        htmlContent: a.htmlContent,
        
        // Sleek features
        barType: a.barType,
        slideDuration: a.slideDuration,
        showCloseButton: a.showCloseButton,
        position: a.position,
        sticky: a.sticky,
        customerTargetingType: a.customerTargetingType,
        customerTargetingTags: a.customerTargetingTags,
        customerTargetingSpend: a.customerTargetingSpend,
        slidesJson: a.slidesJson,
        timezone: a.timezone,
        sliderShowArrows: a.sliderShowArrows,
        sliderArrowsPosition: a.sliderArrowsPosition,
      }));

    const activeIds = active.map((a) => a.id);
    if (activeIds.length > 0) {
      await trackViews(activeIds);
    }

    return Response.json(
      { announcements: active },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[AppProxy] Loader error:", error);
    return Response.json(
      { announcements: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}

