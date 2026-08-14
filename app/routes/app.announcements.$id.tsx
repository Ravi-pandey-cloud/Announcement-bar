import { useState, useEffect } from "react";
// Removed unused imports from polaris and polaris-icons
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect, useLoaderData, useNavigate, useNavigation, useSearchParams, useSubmit } from "react-router";
import { authenticate } from "../shopify.server";
import {
  createAnnouncement,
  getAnnouncement,
  updateAnnouncement,
  getAnnouncementAnalytics,
} from "../models/announcement.server";
import {
  deserializeCountries,
  deserializePages,
  type DisplayPage,
  type SlideData,
  utcToLocal,
} from "../models/announcement.shared";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const isNew = params.id === "new";
  const announcement = isNew ? null : await getAnnouncement(session.shop, params.id!);
  if (!isNew && !announcement) {
    throw new Response("Not found", { status: 404 });
  }
  const url = new URL(request.url);
  const daysParam = url.searchParams.get("days") || "30";
  const startDate = url.searchParams.get("startDate") || "";
  const endDate = url.searchParams.get("endDate") || "";

  let analyticsDays: number | string = 30;
  let analytics: any[] = [];

  if (!isNew) {
    if (daysParam === "custom") {
      analyticsDays = "custom";
      analytics = await getAnnouncementAnalytics(params.id!, startDate, endDate);
    } else {
      analyticsDays = Number(daysParam) || 30;
      analytics = await getAnnouncementAnalytics(params.id!, analyticsDays);
    }
  }

  return { announcement, isNew, analytics, analyticsDays, startDate, endDate };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const displayPages = formData.getAll("displayPages") as DisplayPage[];
  const countries = formData.getAll("countries") as string[];

  // Parse slides to maintain compatibility
  const slidesJsonStr = String(formData.get("slidesJson") || "[]");
  let parsedSlides = [];
  try {
    parsedSlides = JSON.parse(slidesJsonStr);
  } catch (e) {}

  const firstSlide = parsedSlides[0];
  const firstSlideText = firstSlide?.text || "";
  const hasCountdown = parsedSlides.some((s: any) => s.countdownEnabled);
  const firstCountdown = parsedSlides.find((s: any) => s.countdownEnabled);

  const input = {
    name: String(formData.get("name") || "Untitled announcement"),
    message: firstSlideText,
    enabled: formData.get("enabled") === "on",
    displayPages: (displayPages.length ? displayPages : ("all" as const)) as DisplayPage[] | "all",
    customPageUrl: String(formData.get("customPageUrl") || "") || null,
    countries: (countries.length ? countries : ("all" as const)) as string[] | "all",
    linkUrl: firstSlide?.ctaEnabled ? firstSlide.ctaLink : null,
    linkText: firstSlide?.ctaEnabled ? firstSlide.ctaText : null,
    backgroundColor: String(formData.get("backgroundColor") || "#1a1a1a"),
    textColor: String(formData.get("textColor") || "#ffffff"),
    rotationMode: String(formData.get("rotationMode") || "static") as "static" | "carousel" | "scroll",
    startAt: String(formData.get("startAt") || "") || null,
    endAt: String(formData.get("endAt") || "") || null,
    countdownEnabled: hasCountdown,
    countdownEndAt: firstCountdown?.countdownEndAt || null,
    countdownExpiredMessage: firstCountdown?.countdownExpiredMessage || null,
    cartGoalEnabled: formData.get("cartGoalEnabled") === "on",
    cartGoalAmount: formData.get("cartGoalAmount") ? Number(formData.get("cartGoalAmount")) : null,
    cartGoalMessage: String(formData.get("cartGoalMessage") || "") || null,
    cartGoalAchievedMessage: String(formData.get("cartGoalAchievedMessage") || "") || null,
    
    // Design properties
    bgStyle: String(formData.get("bgStyle") || "single"),
    bgGradient: String(formData.get("bgGradient") || "") || null,
    bgAnimation: String(formData.get("bgAnimation") || "none"),
    borderRadius: Number(formData.get("borderRadius") || 0),
    borderSize: Number(formData.get("borderSize") || 0),
    borderColor: String(formData.get("borderColor") || "#000000"),
    fontFamily: String(formData.get("fontFamily") || "inherit"),
    fontSize: Number(formData.get("fontSize") || 14),
    fontBold: formData.get("fontBold") === "on",
    textAnimation: String(formData.get("textAnimation") || "none"),
    customCss: String(formData.get("customCss") || "") || null,
    subtextFontSize: Number(
      formData.get("subtextFontSize") || 14
    ),
    subtextColor: String(
      formData.get("subtextColor") || "#ffffff"
    ),
    subtextBold:
      formData.get("subtextBold") === "on",
    buttonFontSize: Number(formData.get("buttonFontSize") || 12),
    buttonTextColor: String(formData.get("buttonTextColor") || "#000000"),
    buttonBold: formData.get("buttonBold") === "on",
    buttonBgColor: formData.get("buttonBgColor") !== null ? String(formData.get("buttonBgColor")) : "#ffffff",
    timerPosition: String(formData.get("timerPosition") || "default"),
    timerFontSize: Number(formData.get("timerFontSize") || 14),
    timerWidth: String(formData.get("timerWidth") || "auto"),
    timerHeight: String(formData.get("timerHeight") || "auto"),
    timerTextColor: String(formData.get("timerTextColor") || "#ffffff"),
    timerBgColor: formData.get("timerBgColor") !== null ? String(formData.get("timerBgColor")) : "rgba(0,0,0,0.2)",
    paddingTop: Number(formData.get("paddingTop") || 8),
    paddingBottom: Number(formData.get("paddingBottom") || 8),
    marginTop: Number(formData.get("marginTop") || 0),
    marginBottom: Number(formData.get("marginBottom") || 0),
    htmlContent: String(formData.get("htmlContent") || ""),
    // Sleek features
    barType: String(formData.get("barType") || "simple"),
    slideDuration: Number(formData.get("slideDuration") || 5),
    showCloseButton: formData.get("showCloseButton") === "on",
    position: String(formData.get("position") || "top"),
    sticky: formData.get("sticky") === "on",
    customerTargetingType: String(formData.get("customerTargetingType") || "all"),
    customerTargetingTags: String(formData.get("customerTargetingTags") || ""),
    customerTargetingSpend: Number(formData.get("customerTargetingSpend") || 0.0),
    slidesJson: slidesJsonStr,
    sliderShowArrows: formData.get("sliderShowArrows") === "on",
    sliderArrowsPosition: String(formData.get("sliderArrowsPosition") || "corners"),
    timezone: String(formData.get("timezone") || "UTC"),
  };

  if (params.id === "new") {
    await createAnnouncement(session.shop, input);
  } else {
    await updateAnnouncement(session.shop, params.id!, input);
  }

  return redirect("/app");
}

const PAGE_OPTIONS: { value: DisplayPage; label: string; hint: string }[] = [
  { value: "home", label: "Home page", hint: "Storefront homepage" },
  { value: "collection", label: "Collection pages", hint: "All collection listing pages" },
  { value: "product", label: "Product pages", hint: "All product detail pages" },
  { value: "cart", label: "Cart page", hint: "The dedicated cart page" },
  { value: "custom", label: "Custom page", hint: "One specific page you choose below" },
];

const COUNTRY_OPTIONS: { value: string; label: string }[] = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "IN", label: "India" },
  { value: "JP", label: "Japan" },
  { value: "BR", label: "Brazil" },
  { value: "MX", label: "Mexico" },
  { value: "IT", label: "Italy" },
  { value: "ES", label: "Spain" },
  { value: "NL", label: "Netherlands" },
  { value: "SE", label: "Sweden" },
  { value: "SG", label: "Singapore" },
  { value: "AE", label: "United Arab Emirates" },
];

/**
 * A date + time field for the Schedule campaign section, built on Polaris's
 * <DatePicker> (via a <Popover>) for the date portion, paired with a native
 * time input. Combines both into the same "YYYY-MM-DDTHH:mm" string the
 * server action already expects, submitted via a hidden input so the rest
 * of the form/action code didn't need to change.
 */
function ScheduleDateTimeField({
  id,
  name,
  label,
  initialValue,
}: {
  id: string;
  name: string;
  label: string;
  initialValue: string;
}) {
  const [initialDatePart, initialTimePart] = initialValue ? initialValue.split("T") : ["", ""];
  const [initialHour, initialMinute] = initialTimePart ? initialTimePart.split(":") : ["", ""];

  const [datePart, setDatePart] = useState(initialDatePart || "");
  const [hour, setHour] = useState(initialHour || "");
  const [minute, setMinute] = useState(initialMinute || "");

  const combinedValue = datePart
    ? `${datePart}T${String(hour || "0").padStart(2, "0")}:${String(minute || "0").padStart(2, "0")}`
    : "";

  const clampNumber = (value: string, max: number) => {
    const digits = value.replace(/[^0-9]/g, "");
    if (digits === "") return "";
    return String(Math.min(Number(digits), max));
  };

  return (
    <div style={{ flex: 1 }}>
      <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>{label}</label>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <div style={{ flex: 2 }}>
          <s-date-field
            label=""
            placeholder="Select date"
            value={datePart}
            onChange={(e: any) => setDatePart(e.target.value)}
          />
        </div>
        <div style={{ flex: 1, minWidth: 70 }}>
          <s-number-field
            label="Hours"
            min={0}
            max={23}
            value={hour}
            onChange={(e: any) => setHour(clampNumber(e.target.value, 23))}
          />
        </div>
        <div style={{ flex: 1, minWidth: 70 }}>
          <s-number-field
            label="Minutes"
            min={0}
            max={59}
            value={minute}
            onChange={(e: any) => setMinute(clampNumber(e.target.value, 59))}
          />
        </div>
      </div>
      <input type="hidden" id={id} name={name} value={combinedValue} />
    </div>
  );
}

export default function AnnouncementForm() {
  const { announcement, isNew, analytics, analyticsDays, startDate, endDate } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const submit = useSubmit();
  const [searchParams, setSearchParams] = useSearchParams();
  const isSaving = navigation.state === "submitting";

  const todayStr = new Date().toISOString().split("T")[0];
  const [customStartDate, setCustomStartDate] = useState(startDate || todayStr);
  const [customEndDate, setCustomEndDate] = useState(endDate || todayStr);

  const handleAnalyticsRangeChange = (val: string) => {
    const next = new URLSearchParams(searchParams);
    if (val === "custom") {
      next.set("days", "custom");
      next.set("startDate", customStartDate);
      next.set("endDate", customEndDate);
    } else {
      next.set("days", val);
      next.delete("startDate");
      next.delete("endDate");
    }
    setSearchParams(next);
  };

  const handleApplyCustomDates = () => {
    const next = new URLSearchParams(searchParams);
    next.set("days", "custom");
    next.set("startDate", customStartDate);
    next.set("endDate", customEndDate);
    setSearchParams(next);
  };

  const goBack = (e?: { preventDefault?: () => void }) => {
    e?.preventDefault?.();
    navigate("/app");
  };

  const initialPages = announcement ? deserializePages(announcement.displayPages) : "all";
  const [scope, setScope] = useState<"all" | "selected">(
    initialPages === "all" ? "all" : "selected",
  );
  const [selectedPages, setSelectedPages] = useState<DisplayPage[]>(
    initialPages === "all" ? [] : initialPages,
  );

  const initialCountries = announcement ? deserializeCountries(announcement.countries) : "all";
  const [locationScope, setLocationScope] = useState<"all" | "selected">(
    initialCountries === "all" ? "all" : "selected",
  );
  const [selectedCountries, setSelectedCountries] = useState<string[]>(
    initialCountries === "all" ? [] : initialCountries,
  );

  const [name, setName] = useState(announcement?.name ?? "New announcement");
  const [customPageUrl, setCustomPageUrl] = useState(announcement?.customPageUrl ?? "");
  const [enabled, setEnabled] = useState(announcement?.enabled ?? true);
  const [scheduleEnabled, setScheduleEnabled] = useState(
    Boolean(announcement?.startAt || announcement?.endAt),
  );
  const [endDateEnabled, setEndDateEnabled] = useState(Boolean(announcement?.endAt));
  const [rotationMode, setRotationMode] = useState(announcement?.rotationMode ?? "static");
  const [countdownEnabled, setCountdownEnabled] = useState(
    announcement?.countdownEnabled ?? false,
  );
  const [cartGoalEnabled, setCartGoalEnabled] = useState(announcement?.cartGoalEnabled ?? false);
  const [backgroundColor, setBackgroundColor] = useState(
    announcement?.backgroundColor ?? "#1a1a1a",
  );
  const [textColor, setTextColor] = useState(announcement?.textColor ?? "#ffffff");
  const [message, setMessage] = useState(announcement?.message ?? "");
  const [linkText, setLinkText] = useState(announcement?.linkText ?? "");

  // Design states
  const [bgStyle, setBgStyle] = useState(announcement?.bgStyle ?? "single");
  const [bgGradient, setBgGradient] = useState(announcement?.bgGradient ?? "");
  const [bgAnimation, setBgAnimation] = useState(announcement?.bgAnimation ?? "none");
  const [borderRadius, setBorderRadius] = useState(announcement?.borderRadius ?? 0);
  const [borderSize, setBorderSize] = useState(announcement?.borderSize ?? 0);
  const [borderColor, setBorderColor] = useState(announcement?.borderColor ?? "#000000");
  const [fontFamily, setFontFamily] = useState(announcement?.fontFamily ?? "inherit");
  const [fontSize, setFontSize] = useState(announcement?.fontSize ?? 14);
  const [fontBold, setFontBold] = useState(announcement?.fontBold ?? false);
  const [textAnimation, setTextAnimation] = useState(announcement?.textAnimation ?? "none");
  const [customCssEnabled, setCustomCssEnabled] = useState(Boolean(announcement?.customCss));
  const [customCss, setCustomCss] = useState(announcement?.customCss ?? "");

  // Sleek features states
  const [barType, setBarType] = useState(announcement?.barType ?? "simple");
  const [slideDuration, setSlideDuration] = useState(announcement?.slideDuration ?? 5);
  const [showCloseButton, setShowCloseButton] = useState(announcement?.showCloseButton ?? false);
  const [position, setPosition] = useState(announcement?.position ?? "top");
  const [sticky, setSticky] = useState(announcement?.sticky ?? false);
  const [customerTargetingType, setCustomerTargetingType] = useState(announcement?.customerTargetingType ?? "all");
  const [customerTargetingTags, setCustomerTargetingTags] = useState(announcement?.customerTargetingTags ?? "");
  const [customerTargetingSpend, setCustomerTargetingSpend] = useState(announcement?.customerTargetingSpend ?? 0.0);
  const [sliderShowArrows, setSliderShowArrows] = useState(announcement?.sliderShowArrows ?? true);
  const [sliderArrowsPosition, setSliderArrowsPosition] = useState(announcement?.sliderArrowsPosition ?? "corners");
  const [timezone, setTimezone] = useState(announcement?.timezone ?? "UTC");

  const [subtextFontSize, setSubtextFontSize] = useState(
  announcement?.subtextFontSize ?? 14
);

const [subtextColor, setSubtextColor] = useState(
  announcement?.subtextColor ?? "#ffffff"
);

const [subtextBold, setSubtextBold] = useState(
  announcement?.subtextBold ?? false
);

  const [buttonFontSize, setButtonFontSize] = useState(announcement?.buttonFontSize ?? 12);
  const [buttonTextColor, setButtonTextColor] = useState(announcement?.buttonTextColor ?? "#000000");
  const [buttonBold, setButtonBold] = useState(announcement?.buttonBold ?? true);
  const [buttonBgColor, setButtonBgColor] = useState(announcement?.buttonBgColor ?? "#ffffff");

  const [timerPosition, setTimerPosition] = useState(announcement?.timerPosition ?? "default");
  const [timerFontSize, setTimerFontSize] = useState(announcement?.timerFontSize ?? 14);
  const [timerWidth, setTimerWidth] = useState(announcement?.timerWidth ?? "auto");
  const [timerHeight, setTimerHeight] = useState(announcement?.timerHeight ?? "auto");
  const [timerTextColor, setTimerTextColor] = useState(announcement?.timerTextColor ?? "#ffffff");
  const [timerBgColor, setTimerBgColor] = useState(announcement?.timerBgColor ?? "rgba(0,0,0,0.2)");

  const [paddingTop, setPaddingTop] = useState(announcement?.paddingTop ?? 8);
  const [paddingBottom, setPaddingBottom] = useState(announcement?.paddingBottom ?? 8);
  const [marginTop, setMarginTop] = useState(announcement?.marginTop ?? 0);
  const [marginBottom, setMarginBottom] = useState(announcement?.marginBottom ?? 0);

  const [htmlContent, setHtmlContent] = useState(announcement?.htmlContent ?? "");

  // Determine active tab (Analytics shown first for existing announcements, Content for new ones)
  const [activeTab, setActiveTab] = useState(isNew ? "content" : "analytics");

  // Initialize slides
  const defaultSlides: SlideData[] = [
    {
      id: "slide_1",
      text: "Welcome to my store!",
      subtext: "",
      discountCodeEnabled: false,
      discountCode: "",
      discountPlaceInText: false,
      countdownEnabled: false,
      countdownType: "session",
      countdownMinutes: 120,
      countdownEndAt: "",
      countdownExpiredAction: "hide_slide",
      countdownExpiredMessage: "",
      countdownLabelsDays: "Days",
      countdownLabelsHours: "Hours",
      countdownLabelsMins: "Mins",
      countdownLabelsSecs: "Secs",
      countdownLabel: "",
      countdownHideDaysIfLessThan24h: false,
      countdownPlaceInText: false,
      ctaEnabled: false,
      ctaType: "button",
      ctaText: "Click",
      ctaLink: "",
      iconEnabled: false,
      iconType: "icon",
      iconName: "gift"
    }
  ];

  let initialSlides = defaultSlides;
  if (announcement?.slidesJson) {
    try {
      const parsed = JSON.parse(announcement.slidesJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Map saved ISO string countdownEndAt to the local representation for display
        initialSlides = parsed.map((s: any) => ({
          ...s,
          countdownEndAt: s.countdownEndAt ? utcToLocal(new Date(s.countdownEndAt), announcement.timezone || "UTC") : ""
        }));
      }
    } catch (e) {}
  } else if (announcement && announcement.message) {
    initialSlides = [
      {
        ...defaultSlides[0],
        text: announcement.message,
        ctaEnabled: Boolean(announcement.linkUrl && announcement.linkText),
        ctaText: announcement.linkText || "Click",
        ctaLink: announcement.linkUrl || "",
        countdownEnabled: announcement.countdownEnabled,
        countdownEndAt: announcement.countdownEndAt ? utcToLocal(new Date(announcement.countdownEndAt), announcement.timezone || "UTC") : "",
        countdownExpiredMessage: announcement.countdownExpiredMessage || ""
      }
    ];
  }

  const [slides, setSlides] = useState<SlideData[]>(initialSlides);
  const [expandedSlideId, setExpandedSlideId] = useState<string | null>(slides[0]?.id || null);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);

  // SVG Chart interaction state
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; x: number; y: number; date: string; views: number; clicks: number } | null>(null);

  const [hoveredHelpId, setHoveredHelpId] = useState<string | null>(null);

  useEffect(() => {
    if (fontFamily && fontFamily !== "inherit") {
      let fontName = "";
      if (fontFamily.includes("Inter")) {
        fontName = "Inter:wght@400;700";
      } else if (fontFamily.includes("Outfit")) {
        fontName = "Outfit:wght@400;700";
      } else if (fontFamily.includes("Roboto Condensed")) {
        fontName = "Roboto+Condensed:wght@400;700";
      }
      
      if (fontName) {
        const linkId = `ab-preview-font-${fontName.split(":")[0].toLowerCase().replace(/\+/g, "-")}`;
        if (!document.getElementById(linkId)) {
          const link = document.createElement("link");
          link.id = linkId;
          link.rel = "stylesheet";
          link.href = `https://fonts.googleapis.com/css2?family=${fontName}&display=swap`;
          document.head.appendChild(link);
        }
      }
    }
  }, [fontFamily]);

  const addSlide = () => {
    const newId = "slide_" + Math.random().toString(36).substr(2, 9);
    setSlides((prev) => [
      ...prev,
      {
        id: newId,
        text: "New announcement slide message",
        subtext: "",
        discountCodeEnabled: false,
        discountCode: "",
        discountPlaceInText: false,
        countdownEnabled: false,
        countdownType: "session",
        countdownMinutes: 120,
        countdownEndAt: "",
        countdownExpiredAction: "hide_slide",
        countdownExpiredMessage: "",
        countdownLabelsDays: "Days",
        countdownLabelsHours: "Hours",
        countdownLabelsMins: "Mins",
        countdownLabelsSecs: "Secs",
        countdownLabel: "",
        countdownHideDaysIfLessThan24h: false,
        countdownPlaceInText: false,
        ctaEnabled: false,
        ctaType: "button",
        ctaText: "Click",
        ctaLink: "",
        iconEnabled: false,
        iconType: "icon",
        iconName: "gift"
      }
    ]);
    setExpandedSlideId(newId);
  };

  const removeSlide = (id: string) => {
    if (slides.length <= 1) return;
    setSlides((prev) => prev.filter((s) => s.id !== id));
    if (expandedSlideId === id) {
      setExpandedSlideId(slides.find((s) => s.id !== id)?.id || null);
    }
    if (previewSlideIndex >= slides.length - 1) {
      setPreviewSlideIndex(0);
    }
  };

  const moveSlide = (index: number, direction: number) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= slides.length) return;
    setSlides((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[newIndex];
      copy[newIndex] = temp;
      return copy;
    });
  };

  const updateSlide = (id: string, updates: Partial<SlideData>) => {
    setSlides((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const togglePage = (page: DisplayPage) => {
    setSelectedPages((prev) =>
      prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page],
    );
  };

  const toggleCountry = (code: string) => {
    setSelectedCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const applyThemePreset = (presetName: string) => {
    switch (presetName) {
      case "Black":
        setBgStyle("single");
        setBackgroundColor("#000000");
        setTextColor("#ffffff");
        setBgGradient("");
        break;
      case "Dark blue":
        setBgStyle("single");
        setBackgroundColor("#1a365d");
        setTextColor("#ffffff");
        setBgGradient("");
        break;
      case "Dark green":
        setBgStyle("single");
        setBackgroundColor("#1c4532");
        setTextColor("#ffffff");
        setBgGradient("");
        break;
      case "Dark orange":
        setBgStyle("single");
        setBackgroundColor("#7b341e");
        setTextColor("#ffffff");
        setBgGradient("");
        break;
      case "Dark purple":
        setBgStyle("single");
        setBackgroundColor("#44337a");
        setTextColor("#ffffff");
        setBgGradient("");
        break;
      case "Dark red":
        setBgStyle("single");
        setBackgroundColor("#9b2c2c");
        setTextColor("#ffffff");
        setBgGradient("");
        break;
      case "Green gradient":
        setBgStyle("gradient");
        setBgGradient("linear-gradient(135deg, #11998e, #38ef7d)");
        setTextColor("#ffffff");
        break;
      case "Sunset gradient":
        setBgStyle("gradient");
        setBgGradient("linear-gradient(135deg, #f12711, #f5af19)");
        setTextColor("#ffffff");
        break;
      case "Purple gradient":
        setBgStyle("gradient");
        setBgGradient("linear-gradient(135deg, #8a2387, #e94057, #f27121)");
        setTextColor("#ffffff");
        break;
      default:
        break;
    }
  };

  const handleSubmit = (formEl: HTMLFormElement) => {
    const formData = new FormData(formEl);
    formData.delete("displayPages");
    if (scope !== "all") {
      selectedPages.forEach((p) => formData.append("displayPages", p));
    }
    formData.delete("countries");
    if (locationScope !== "all") {
      selectedCountries.forEach((c) => formData.append("countries", c));
    }
    if (!scheduleEnabled) {
      formData.delete("startAt");
      formData.delete("endAt");
    }
    
    // Explicitly set all configuration fields manually from React state to ensure they save correctly
    formData.set("name", name);
    formData.set("enabled", enabled ? "on" : "off");
    formData.set("slidesJson", JSON.stringify(slides));
    formData.set("barType", barType);
    formData.set("rotationMode", rotationMode);
    formData.set("backgroundColor", backgroundColor);
    formData.set("textColor", textColor);
    formData.set("customPageUrl", customPageUrl);
    formData.set("slideDuration", slideDuration.toString());
    formData.set("showCloseButton", showCloseButton ? "on" : "off");
    formData.set("position", position);
    formData.set("sticky", sticky ? "on" : "off");
    formData.set("customerTargetingType", customerTargetingType);
    formData.set("customerTargetingTags", customerTargetingTags);
    formData.set("customerTargetingSpend", customerTargetingSpend.toString());
    formData.set("sliderShowArrows", sliderShowArrows ? "on" : "off");
    formData.set("sliderArrowsPosition", sliderArrowsPosition);
    formData.set("timezone", timezone);

    // Design fields
    formData.set("bgStyle", bgStyle);
    formData.set("bgGradient", bgGradient);
    formData.set("bgAnimation", bgAnimation);
    formData.set("borderRadius", borderRadius.toString());
    formData.set("borderSize", borderSize.toString());
    formData.set("borderColor", borderColor);
    formData.set("fontFamily", fontFamily);
    formData.set("fontSize", fontSize.toString());
    formData.set("fontBold", fontBold ? "on" : "off");
    formData.set("textAnimation", textAnimation);
    formData.set("customCss", customCss);
    
    formData.set("subtextFontSize", subtextFontSize.toString());
    formData.set("subtextColor", subtextColor);
    formData.set("subtextBold", subtextBold ? "on" : "off");
    
    formData.set("buttonFontSize", buttonFontSize.toString());
    formData.set("buttonTextColor", buttonTextColor);
    formData.set("buttonBold", buttonBold ? "on" : "off");
    formData.set("buttonBgColor", buttonBgColor);
    
    formData.set("timerPosition", timerPosition);
    formData.set("timerFontSize", timerFontSize.toString());
    formData.set("timerWidth", timerWidth);
    formData.set("timerHeight", timerHeight);
    formData.set("timerTextColor", timerTextColor);
    formData.set("timerBgColor", timerBgColor);
    
    formData.set("paddingTop", paddingTop.toString());
    formData.set("paddingBottom", paddingBottom.toString());
    formData.set("marginTop", marginTop.toString());
    formData.set("marginBottom", marginBottom.toString());
    formData.set("htmlContent", htmlContent);

    submit(formData, { method: "post" });
  };

  const tabStyle = {
    padding: "10px 18px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#6d7175",
    background: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  };

  const activeTabStyle = {
    ...tabStyle,
    color: "#1a1a1a",
    borderBottom: "2px solid #1a1a1a",
  };

  // Helper for live preview rendering
  const activePreviewSlide = slides[previewSlideIndex] || slides[0] || defaultSlides[0];
  const isSplitTextLeft = timerPosition === "split-text-left-timer-right";
  const isSplitTimerLeft = timerPosition === "split-timer-left-text-right";
  const isSplitLayout = isSplitTextLeft || isSplitTimerLeft;

  const getPreviewText = (slide: SlideData) => {
    let t = slide.text;
    if (slide.discountCodeEnabled && slide.discountCode && slide.discountPlaceInText) {
      t = t.replace("{discount_code}", slide.discountCode);
    }
    if (slide.countdownEnabled && slide.countdownPlaceInText) {
      t = t.replace("{countdown}", "00:02:00:00");
    }
    return t;
  };

  const getPreviewEmoji = (slide: SlideData) => {
    if (!slide.iconEnabled) return null;
    if (slide.iconType === "badge") {
      return (
        <span style={{
          background: "rgba(255, 255, 255, 0.25)",
          padding: "2px 6px",
          borderRadius: 4,
          fontSize: "11px",
          fontWeight: "bold",
          marginRight: 6
        }}>
          {slide.iconName || "NEW"}
        </span>
      );
    }
    const emojiMap: Record<string, string> = {
      gift: "🎁",
      tag: "🏷️",
      bell: "🔔",
      star: "⭐",
      heart: "❤️",
      cart: "🛒",
      coupon: "🎟️",
      sparkles: "✨",
      fire: "🔥",
      megaphone: "📢"
    };
    return <span style={{ marginRight: 6 }}>{emojiMap[slide.iconName] || "🎁"}</span>;
  };

  // Process data for chart
  let chartData: any[] = [];

  if (analyticsDays === "custom" && startDate && endDate) {
    const dates = [];
    let curr = new Date(startDate);
    const end = new Date(endDate);
    let limit = 0;
    while (curr <= end && limit < 400) {
      dates.push(curr.toISOString().split("T")[0]);
      curr.setDate(curr.getDate() + 1);
      limit++;
    }
    chartData = dates.map(dStr => {
      const match = analytics.find((item: any) => item.date === dStr);
      return {
        date: dStr,
        views: match ? match.views : 0,
        clicks: match ? match.clicks : 0
      };
    });
  } else {
    chartData = analytics && analytics.length > 0
      ? [...analytics].sort((a, b) => a.date.localeCompare(b.date))
      : Array.from({ length: Number(analyticsDays) || 30 }).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - ((Number(analyticsDays) || 30) - 1 - i));
          return {
            date: d.toISOString().split("T")[0],
            views: 0,
            clicks: 0,
          };
        });
  }

  const totalViews = chartData.reduce((sum, item) => sum + item.views, 0);
  const totalClicks = chartData.reduce((sum, item) => sum + item.clicks, 0);
  const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0.0";

  // SVG Chart Geometry Constants
  const svgWidth = 720;
  const svgHeight = 220;
  const paddingLeft = 40;
  const paddingRight = 20;
  const chartPaddingTop = 20;
  const chartPaddingBottom = 30;

  const maxViews = Math.max(...chartData.map(d => d.views), 5);
  const points = chartData.map((d, i) => {
    const divisor = chartData.length - 1 || 1;
    const x = paddingLeft + (i * (svgWidth - paddingLeft - paddingRight)) / divisor;
    const y = svgHeight - chartPaddingBottom - (d.views / maxViews) * (svgHeight - chartPaddingTop - chartPaddingBottom);
    return { x, y, date: d.date, views: d.views, clicks: d.clicks, index: i };
  });

  // SVG Line path string
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  // SVG Area path string
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${svgHeight - chartPaddingBottom} L ${points[0].x} ${svgHeight - chartPaddingBottom} Z`
    : "";

  const renderSlideFields = (slide: SlideData) => {
    return (
      <s-stack direction="block" gap="base">
        <s-text-field
          label="Announcement text"
          value={slide.text}
          onChange={(e: any) => updateSlide(slide.id, { text: e.target.value })}
          required
        />
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "-12px", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#6d7175" }}>
            <span>This field supports HTML</span>
            <span
              style={{
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: "#f1f2f4",
                color: "#202223",
                fontWeight: "bold",
                fontSize: "12px",
                textAlign: "center"
              }}
              onMouseEnter={() => setHoveredHelpId(slide.id)}
              onMouseLeave={() => setHoveredHelpId(null)}
              onClick={() => setHoveredHelpId(hoveredHelpId === slide.id ? null : slide.id)}
            >
              ?
            </span>
          </div>

          {hoveredHelpId === slide.id && (
            <div
              style={{
                position: "absolute",
                top: "26px",
                left: "0",
                zIndex: 100,
                width: "280px",
                background: "#ffffff",
                border: "1px solid #dfe3e8",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                padding: "12px",
                fontSize: "13px",
                color: "#202223",
                lineHeight: "1.5",
                textAlign: "left"
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-6px",
                  left: "140px",
                  width: "10px",
                  height: "10px",
                  background: "#ffffff",
                  borderLeft: "1px solid #dfe3e8",
                  borderTop: "1px solid #dfe3e8",
                  transform: "rotate(45deg)",
                }}
              />
              You can use HTML tags to format your text. For example, you can use <strong>&lt;strong&gt;&lt;/strong&gt;</strong> to make the text bold, <em>&lt;em&gt;&lt;/em&gt;</em> to make it italic, or <a href="#" onClick={(e) => e.preventDefault()}>&lt;a href="#"&gt;&lt;/a&gt;</a> to add a link.
            </div>
          )}
        </div>

        <s-text-field
          label="Subtext (optional)"
          value={slide.subtext}
          onChange={(e: any) => updateSlide(slide.id, { subtext: e.target.value })}
        />

        <div style={{ fontWeight: "600", fontSize: 13, marginTop: 8 }}>Extras</div>

        {/* Discount code section */}
        <s-box padding="base" background="subdued" borderRadius="base">
          <s-checkbox
            label="Discount code"
            checked={slide.discountCodeEnabled}
            onChange={(e: any) => updateSlide(slide.id, { discountCodeEnabled: e.target.checked })}
          />
          {slide.discountCodeEnabled && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              <s-text-field
                label="Code"
                value={slide.discountCode}
                onChange={(e: any) => updateSlide(slide.id, { discountCode: e.target.value })}
              />
              <s-checkbox
                label="Place the code in the announcement text"
                checked={slide.discountPlaceInText}
                onChange={(e: any) => updateSlide(slide.id, { discountPlaceInText: e.target.checked })}
                details="If checked, use {discount_code} in the announcement text to place it. Otherwise, it will render next to the text."
              />
            </div>
          )}
        </s-box>

        {/* Countdown Section */}
        <s-box padding="base" background="subdued" borderRadius="base">
          <s-checkbox
            label="Countdown"
            checked={slide.countdownEnabled}
            onChange={(e: any) => updateSlide(slide.id, { countdownEnabled: e.target.checked })}
          />
          {slide.countdownEnabled && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 12 }}>
              <s-text-field
                label="Countdown timer title/label (optional)"
                value={slide.countdownLabel || ""}
                onChange={(e: any) => updateSlide(slide.id, { countdownLabel: e.target.value })}
                placeholder="OFFER ENDS IN"
              />
              <s-choice-list
                label="Type"
                values={[slide.countdownType]}
                onChange={(e: any) => updateSlide(slide.id, { countdownType: e.target.values[0] })}
              >
                <s-choice value="session">Fixed amount of time (user session timer)</s-choice>
                <s-choice value="date">Countdown to a specific date</s-choice>
              </s-choice-list>

              {slide.countdownType === "session" ? (
                <s-number-field
                  label="Minutes"
                  value={slide.countdownMinutes.toString()}
                  onChange={(e: any) => updateSlide(slide.id, { countdownMinutes: Number(e.target.value || 0) })}
                />
              ) : (
                <div>
                  <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Ends at</label>
                  <input
                    type="datetime-local"
                    value={slide.countdownEndAt || ""}
                    onChange={(e) => updateSlide(slide.id, { countdownEndAt: e.target.value })}
                    style={{
                      padding: "6px 8px",
                      borderRadius: 6,
                      border: "1px solid #c9cccf",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              )}

              <s-select
                label="When the countdown ends"
                value={slide.countdownExpiredAction}
                onChange={(e: any) => updateSlide(slide.id, { countdownExpiredAction: e.target.value })}
              >
                <s-option value="hide_slide">Hide the slide</s-option>
                <s-option value="hide_bar">Hide the bar</s-option>
                <s-option value="show_message">Show message</s-option>
                <s-option value="do_nothing">Do nothing</s-option>
              </s-select>

              {slide.countdownExpiredAction === "show_message" && (
                <s-text-field
                  label="Expired message"
                  value={slide.countdownExpiredMessage || ""}
                  onChange={(e: any) => updateSlide(slide.id, { countdownExpiredMessage: e.target.value })}
                />
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                <s-text-field
                  label="Days"
                  value={slide.countdownLabelsDays}
                  onChange={(e: any) => updateSlide(slide.id, { countdownLabelsDays: e.target.value })}
                />
                <s-text-field
                  label="Hours"
                  value={slide.countdownLabelsHours}
                  onChange={(e: any) => updateSlide(slide.id, { countdownLabelsHours: e.target.value })}
                />
                <s-text-field
                  label="Mins"
                  value={slide.countdownLabelsMins}
                  onChange={(e: any) => updateSlide(slide.id, { countdownLabelsMins: e.target.value })}
                />
                <s-text-field
                  label="Secs"
                  value={slide.countdownLabelsSecs}
                  onChange={(e: any) => updateSlide(slide.id, { countdownLabelsSecs: e.target.value })}
                />
              </div>

              <s-checkbox
                label="Hide the day label when there is less than 24 hours left"
                checked={slide.countdownHideDaysIfLessThan24h}
                onChange={(e: any) => updateSlide(slide.id, { countdownHideDaysIfLessThan24h: e.target.checked })}
              />

              <s-checkbox
                label="Place the countdown in the announcement text"
                checked={slide.countdownPlaceInText}
                onChange={(e: any) => updateSlide(slide.id, { countdownPlaceInText: e.target.checked })}
                details="If checked, use {countdown} in the announcement text to place it. Otherwise, it will render next to the text."
              />
            </div>
          )}
        </s-box>

        {/* CTA (Call To Action) Link Section */}
        <s-box padding="base" background="subdued" borderRadius="base">
          <s-checkbox
            label="Call-to-action"
            checked={slide.ctaEnabled}
            onChange={(e: any) => updateSlide(slide.id, { ctaEnabled: e.target.checked })}
          />
          {slide.ctaEnabled && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 12 }}>
              <s-choice-list
                label="Type"
                values={[slide.ctaType]}
                onChange={(e: any) => updateSlide(slide.id, { ctaType: e.target.values[0] })}
              >
                <s-choice value="button">Button</s-choice>
                <s-choice value="full_bar">Full bar clickable</s-choice>
              </s-choice-list>

              {slide.ctaType === "button" && (
                <s-text-field
                  label="Button text"
                  value={slide.ctaText}
                  onChange={(e: any) => updateSlide(slide.id, { ctaText: e.target.value })}
                />
              )}

              <s-text-field
                label="Link"
                placeholder="https://my-store.com/collections/sales"
                value={slide.ctaLink}
                onChange={(e: any) => updateSlide(slide.id, { ctaLink: e.target.value })}
              />
            </div>
          )}
        </s-box>

        {/* Icon / Badge Section */}
        <s-box padding="base" background="subdued" borderRadius="base">
          <s-checkbox
            label="Icon/badge before the text"
            checked={slide.iconEnabled}
            onChange={(e: any) => updateSlide(slide.id, { iconEnabled: e.target.checked })}
          />
          {slide.iconEnabled && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 12 }}>
              <s-choice-list
                label="Type"
                values={[slide.iconType]}
                onChange={(e: any) => updateSlide(slide.id, { iconType: e.target.values[0] })}
              >
                <s-choice value="icon">Icon</s-choice>
                <s-choice value="badge">Badge</s-choice>
              </s-choice-list>

              {slide.iconType === "icon" ? (
                <s-select
                  label="Icon"
                  value={slide.iconName}
                  onChange={(e: any) => updateSlide(slide.id, { iconName: e.target.value })}
                >
                  <s-option value="gift">Gift 🎁</s-option>
                  <s-option value="tag">Tag 🏷️</s-option>
                  <s-option value="bell">Bell 🔔</s-option>
                  <s-option value="star">Star ⭐</s-option>
                  <s-option value="heart">Heart ❤️</s-option>
                  <s-option value="cart">Cart 🛒</s-option>
                  <s-option value="coupon">Coupon 🎟️</s-option>
                  <s-option value="sparkles">Sparkles ✨</s-option>
                  <s-option value="fire">Fire 🔥</s-option>
                  <s-option value="megaphone">Megaphone 📢</s-option>
                </s-select>
              ) : (
                <s-text-field
                  label="Badge text"
                  value={slide.iconName}
                  onChange={(e: any) => updateSlide(slide.id, { iconName: e.target.value })}
                />
              )}
            </div>
          )}
        </s-box>
      </s-stack>
    );
  };

  const renderPreviewCountdown = (orderValue?: number) => {
    if (!activePreviewSlide.countdownEnabled || activePreviewSlide.countdownPlaceInText) return null;
    return (
      <span
        style={{
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          marginLeft: 8,
          padding: timerBgColor ? "4px 8px" : "0",
          borderRadius: 4,
          backgroundColor: timerBgColor || "transparent",
          color: timerTextColor || textColor,
          fontSize: `${timerFontSize}px`,
          width: timerWidth && timerWidth !== "auto" ? (isNaN(Number(timerWidth)) ? timerWidth : `${timerWidth}px`) : "auto",
          height: timerHeight && timerHeight !== "auto" ? (isNaN(Number(timerHeight)) ? timerHeight : `${timerHeight}px`) : "auto",
          order: orderValue !== undefined ? orderValue : (isSplitTextLeft ? 10 : (isSplitTimerLeft ? -10 : (timerPosition === "left" ? -1 : (timerPosition === "right" ? 2 : 1)))),
        }}
      >
        {activePreviewSlide.countdownLabel && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: "600", textTransform: "uppercase", marginBottom: "2px", opacity: 0.9 }}>
            <span>{activePreviewSlide.countdownLabel}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block" }}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </span>
        )}
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <span style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
            <span style={{ fontWeight: "bold" }}>02</span>
            <span style={{ fontSize: "8px", opacity: 0.8 }}>{activePreviewSlide.countdownLabelsDays || "d"}</span>
          </span>
          <span>:</span>
          <span style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
            <span style={{ fontWeight: "bold" }}>14</span>
            <span style={{ fontSize: "8px", opacity: 0.8 }}>{activePreviewSlide.countdownLabelsHours || "h"}</span>
          </span>
          <span>:</span>
          <span style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
            <span style={{ fontWeight: "bold" }}>35</span>
            <span style={{ fontSize: "8px", opacity: 0.8 }}>{activePreviewSlide.countdownLabelsMins || "m"}</span>
          </span>
          <span>:</span>
          <span style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
            <span style={{ fontWeight: "bold" }}>19</span>
            <span style={{ fontSize: "8px", opacity: 0.8 }}>{activePreviewSlide.countdownLabelsSecs || "s"}</span>
          </span>
        </span>
      </span>
    );
  };

  return (
    <s-page inlineSize="large" heading={isNew ? "Create announcement" : `Edit ${name}`}>
      <style dangerouslySetInnerHTML={{ __html: `
        s-page, .Polaris-Page, [class*="Polaris-Page"] {
          max-width: none !important;
          width: 100% !important;
        }
      ` }} />
      <s-button slot="secondary-actions" href="/app" onClick={goBack}>
        Cancel
      </s-button>

      <form
        id="announcement-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(e.currentTarget);
        }}
        style={{ paddingBottom: "250px" }}
      >
        {/* Hidden inputs for custom state fields */}
        <input type="hidden" name="bgStyle" value={bgStyle} />
        <input type="hidden" name="bgGradient" value={bgGradient} />
        <input type="hidden" name="bgAnimation" value={bgAnimation} />
        <input type="hidden" name="borderRadius" value={borderRadius} />
        <input type="hidden" name="borderSize" value={borderSize} />
        <input type="hidden" name="borderColor" value={borderColor} />
        <input type="hidden" name="fontFamily" value={fontFamily} />
        <input type="hidden" name="fontSize" value={fontSize} />
        <input type="hidden" name="fontBold" value={fontBold ? "on" : "off"} />
        <input type="hidden" name="textAnimation" value={textAnimation} />
<input
  type="hidden"
  name="subtextFontSize"
  value={subtextFontSize}
/>

<input
  type="hidden"
  name="subtextColor"
  value={subtextColor}
/>

<input
  type="hidden"
  name="subtextBold"
  value={subtextBold ? "on" : "off"}
/>

        <input type="hidden" name="buttonFontSize" value={buttonFontSize} />
        <input type="hidden" name="buttonTextColor" value={buttonTextColor} />
        <input type="hidden" name="buttonBold" value={buttonBold ? "on" : "off"} />
        <input type="hidden" name="buttonBgColor" value={buttonBgColor} />
        <input type="hidden" name="timerPosition" value={timerPosition} />
        <input type="hidden" name="timerFontSize" value={timerFontSize} />
        <input type="hidden" name="timerWidth" value={timerWidth} />
        <input type="hidden" name="timerHeight" value={timerHeight} />
        <input type="hidden" name="timerTextColor" value={timerTextColor} />
        <input type="hidden" name="timerBgColor" value={timerBgColor} />
        <input type="hidden" name="paddingTop" value={paddingTop} />
        <input type="hidden" name="paddingBottom" value={paddingBottom} />
        <input type="hidden" name="marginTop" value={marginTop} />
        <input type="hidden" name="marginBottom" value={marginBottom} />
        <input type="hidden" name="htmlContent" value={htmlContent} />
        <input type="hidden" name="sliderShowArrows" value={sliderShowArrows ? "on" : "off"} />
        <input type="hidden" name="sliderArrowsPosition" value={sliderArrowsPosition} />
        {/* Tabbed Navigation Bar */}
        <div style={{ display: "flex", gap: 8, borderBottom: "1px solid #dfe3e8", marginBottom: 20 }}>
          {!isNew && (
            <button
              type="button"
              onClick={() => setActiveTab("analytics")}
              style={activeTab === "analytics" ? activeTabStyle : tabStyle}
            >
              <s-icon type="chart-vertical" />
              Analytics
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab("content")}
            style={activeTab === "content" ? activeTabStyle : tabStyle}
          >
            <s-icon type="note" />
            Content
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("design")}
            style={activeTab === "design" ? activeTabStyle : tabStyle}
          >
            <s-icon type="paint-brush-round" />
            Design
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("placement")}
            style={activeTab === "placement" ? activeTabStyle : tabStyle}
          >
            <s-icon type="location" />
            Placement
          </button>
        </div>

        <s-stack direction="inline" gap="large-200">
          <div style={{ flex: "2 1 560px", minWidth: 0 }}>
            <s-stack direction="block" gap="large-200">

              {/* 0. ANALYTICS TAB */}
              {activeTab === "analytics" && !isNew && (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
                    {String(analyticsDays) === "custom" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                         <span style={{ fontSize: 13, color: "#6d7175" }}>From:</span>
                         <div style={{ width: "130px" }}>
                           <s-date-field
                             label=""
                             placeholder="Select date"
                             value={customStartDate}
                             onChange={(e: any) => setCustomStartDate(e.target.value)}
                           />
                         </div>
                         <span style={{ fontSize: 13, color: "#6d7175" }}>To:</span>
                         <div style={{ width: "130px" }}>
                           <s-date-field
                             label=""
                             placeholder="Select date"
                             value={customEndDate}
                             onChange={(e: any) => setCustomEndDate(e.target.value)}
                           />
                         </div>
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
                      value={String(analyticsDays) === "custom" ? "custom" : String(analyticsDays)}
                      onChange={(e) => handleAnalyticsRangeChange(e.target.value)}
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
                      <option value="custom">Custom Date Range</option>
                    </select>
                  </div>

                  <s-section heading="Performance Overview">
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 16,
                      marginBottom: 20
                    }}>
                      <div style={{
                        background: "#fff",
                        border: "1px solid #e3e3e3",
                        borderRadius: 8,
                        padding: 16,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                      }}>
                        <div style={{ fontSize: 13, color: "#6d7175", marginBottom: 4 }}>Views</div>
                        <div style={{ fontSize: 24, fontWeight: "700", color: "#202223" }}>
                          {totalViews.toLocaleString()}
                        </div>
                      </div>

                      <div style={{
                        background: "#fff",
                        border: "1px solid #e3e3e3",
                        borderRadius: 8,
                        padding: 16,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                      }}>
                        <div style={{ fontSize: 13, color: "#6d7175", marginBottom: 4 }}>Clicks</div>
                        <div style={{ fontSize: 24, fontWeight: "700", color: "#202223" }}>
                          {totalClicks.toLocaleString()}
                        </div>
                      </div>

                      <div style={{
                        background: "#fff",
                        border: "1px solid #e3e3e3",
                        borderRadius: 8,
                        padding: 16,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                      }}>
                        <div style={{ fontSize: 13, color: "#6d7175", marginBottom: 4 }}>Click-through rate (CTR)</div>
                        <div style={{ fontSize: 24, fontWeight: "700", color: "#202223" }}>
                          {ctr}%
                        </div>
                      </div>
                    </div>
                  </s-section>

                   <s-section
                    heading={
                      analyticsDays === "custom"
                        ? `Views Over Time (${startDate || ""} to ${endDate || ""})`
                        : `Views Over Time (Last ${analyticsDays} Days)`
                    }
                  >
                    <div style={{
                      background: "#fff",
                      border: "1px solid #e3e3e3",
                      borderRadius: 12,
                      padding: "20px 16px 12px 16px",
                      position: "relative",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                    }}>
                      {/* SVG Chart */}
                      <svg
                        width="100%"
                        height={svgHeight}
                        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                        style={{ overflow: "visible" }}
                      >
                        <defs>
                          <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#1a1a1a" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="#1a1a1a" stopOpacity="0.00" />
                          </linearGradient>
                        </defs>

                        {/* Y-Axis Horizontal Grid Lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                          const y = paddingTop + ratio * (svgHeight - paddingTop - paddingBottom);
                          const val = Math.round(maxViews - ratio * maxViews);
                          return (
                            <g key={idx}>
                              <line
                                x1={paddingLeft}
                                y1={y}
                                x2={svgWidth - paddingRight}
                                y2={y}
                                stroke="#f1f2f4"
                                strokeWidth="1"
                              />
                              <text
                                x={paddingLeft - 10}
                                y={y + 4}
                                fill="#8c9196"
                                fontSize="11"
                                textAnchor="end"
                              >
                                {val}
                              </text>
                            </g>
                          );
                        })}

                        {/* Fill Area path under line */}
                        {areaPath && (
                          <path d={areaPath} fill="url(#chart-area-grad)" />
                        )}

                        {/* Stroke Path line */}
                        {linePath && (
                          <path
                            d={linePath}
                            fill="none"
                            stroke="#1a1a1a"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

                        {/* X-Axis dates */}
                        {points.map((p, idx) => {
                          // Display date label every 6th point
                          if (idx % 6 !== 0 && idx !== points.length - 1) return null;
                          const dateObj = new Date(p.date);
                          const label = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                          return (
                            <text
                              key={idx}
                              x={p.x}
                              y={svgHeight - 10}
                              fill="#8c9196"
                              fontSize="11"
                              textAnchor="middle"
                            >
                              {label}
                            </text>
                          );
                        })}

                        {/* Interactive Hover Areas */}
                        {points.map((p, idx) => (
                          <rect
                            key={idx}
                            x={p.x - 10}
                            y={paddingTop}
                            width="20"
                            height={svgHeight - paddingTop - paddingBottom}
                            fill="transparent"
                            style={{ cursor: "pointer" }}
                            onMouseEnter={() => setHoveredPoint(p)}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                        ))}

                        {/* Hover circles */}
                        {points.map((p, idx) => (
                          <circle
                            key={idx}
                            cx={p.x}
                            cy={p.y}
                            r={hoveredPoint?.index === idx ? 6 : 3}
                            fill={hoveredPoint?.index === idx ? "#1a1a1a" : "#ffffff"}
                            stroke="#1a1a1a"
                            strokeWidth={hoveredPoint?.index === idx ? 2 : 1.5}
                            style={{ pointerEvents: "none" }}
                          />
                        ))}
                      </svg>

                      {/* Tooltip Overlay */}
                      {hoveredPoint && (
                        <div style={{
                          position: "absolute",
                          left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                          top: `${(hoveredPoint.y / svgHeight) * 100 - 32}%`,
                          transform: "translate(-50%, -100%)",
                          background: "#1a1a1a",
                          color: "#fff",
                          padding: "6px 10px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: "500",
                          pointerEvents: "none",
                          boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
                          zIndex: 10,
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                          whiteSpace: "nowrap"
                        }}>
                          <div style={{ opacity: 0.8 }}>
                            {new Date(hoveredPoint.date).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric"
                            })}
                          </div>
                          <div>Views: <strong>{hoveredPoint.views}</strong></div>
                          {hoveredPoint.clicks > 0 && (
                            <div>Clicks: <strong>{hoveredPoint.clicks}</strong></div>
                          )}
                        </div>
                      )}
                    </div>

                  </s-section>
                </>
              )}

              {/* 1. CONTENT TAB */}
              {activeTab === "content" && (
                <>
                  <s-section heading="General">
                    <s-stack direction="block" gap="base">
                      <s-checkbox
                        label="Enabled"
                        checked={enabled}
                        onChange={(e: any) => setEnabled(e.target.checked)}
                      ></s-checkbox>
                      
                      <s-text-field
                        name="name"
                        label="Announcement name"
                        details="Internal name to help you identify this bar. Not shown to customers."
                        value={name}
                        onChange={(e: any) => setName(e.target.value)}
                        required
                      ></s-text-field>

                      <s-choice-list
                        label="Type"
                        values={[barType]}
                        onChange={(e: any) => {
                          const typeVal = e.target.values[0];
                          setBarType(typeVal);
                          // Sync Polaris rotation mode
                          if (typeVal === "multiple-slides") {
                            setRotationMode("carousel");
                          } else if (typeVal === "running-line") {
                            setRotationMode("scroll");
                          } else {
                            setRotationMode("static");
                          }
                        }}
                      >
                        <s-choice value="simple">Simple</s-choice>
                        <s-choice value="running-line">Running line</s-choice>
                        <s-choice value="multiple-slides">Multiple slides</s-choice>
                      </s-choice-list>

                      {(barType === "multiple-slides" || barType === "running-line") && (
                        <div style={{ marginTop: 12 }}>
                          <label style={{ display: "block", fontSize: 13, marginBottom: 4, fontWeight: "500" }}>
                            Slide appearance duration (seconds): {slideDuration}s
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="20"
                            value={slideDuration}
                            onChange={(e) => setSlideDuration(Number(e.target.value))}
                            style={{ width: "100%", accentColor: "#1a1a1a" }}
                          />
                        </div>
                      )}

                      {barType === "multiple-slides" && (
                        <s-stack direction="block" gap="base">
                          <s-checkbox
                            label="Show slider navigation arrows"
                            checked={sliderShowArrows}
                            onChange={(e: any) => setSliderShowArrows(e.target.checked)}
                          />
                          {sliderShowArrows && (
                            <s-choice-list
                              label="Slider arrows placement"
                              values={[sliderArrowsPosition]}
                              onChange={(e: any) => setSliderArrowsPosition(e.target.values[0])}
                            >
                              <s-choice value="corners">Left & Right corners</s-choice>
                              <s-choice value="near-text">Near the text (left & right)</s-choice>
                            </s-choice-list>
                          )}
                        </s-stack>
                      )}

                      <s-checkbox
                        label="Show a cross to dismiss the bar"
                        checked={showCloseButton}
                        onChange={(e: any) => setShowCloseButton(e.target.checked)}
                      />
                    </s-stack>
                  </s-section>

                  {/* TRANSLATIONS INFO CARD */}
                  <s-section heading="Localization & Translations">
                    <div style={{
                      background: "#f4f6f8",
                      border: "1px solid #e3e3e3",
                      borderRadius: 10,
                      padding: 20,
                      display: "flex",
                      gap: 16,
                      alignItems: "flex-start",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.01)"
                    }}>
                      <span style={{ fontSize: 24, lineHeight: 1 }}>🌐</span>
                      <div>
                        <h4 style={{ margin: "0 0 6px 0", fontSize: 14, fontWeight: 600, color: "#202223" }}>
                          Translations option
                        </h4>
                        <p style={{ margin: "0 0 12px 0", fontSize: 13, lineHeight: 1.5, color: "#6d7175" }}>
                          Make this announcement bar multilingual to reach customers in their own language.
                          This app integrates natively with Shopify&apos;s translation engine. Any storefront text you define here can be localized by translating the announcement bar custom resources.
                        </p>
                        <div style={{
                          fontSize: 12,
                          color: "#202223",
                          display: "flex",
                          flexDirection: "column",
                          gap: 6
                        }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <strong>1.</strong>
                            <span>Go to Shopify admin settings &gt; <strong>Languages</strong>.</span>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <strong>2.</strong>
                            <span>Open your translation app of choice (e.g. <strong>Shopify Translate &amp; Adapt</strong>).</span>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <strong>3.</strong>
                            <span>Translate the announcement bar text fields to your active market languages.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </s-section>

                  <s-section heading={barType === "multiple-slides" ? "Text / Slides" : "Announcement Content"}>
                    <s-stack direction="block" gap="base">
                      {barType === "multiple-slides" ? (
                        slides.map((slide, idx) => {
                          const isExpanded = expandedSlideId === slide.id;
                          return (
                            <s-box
                              key={slide.id}
                              padding="base"
                              background="base"
                              borderRadius="base"
                              border="base"
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: isExpanded ? "1px solid #dfe3e8" : "none", paddingBottom: isExpanded ? 8 : 0, marginBottom: isExpanded ? 12 : 0 }}>
                                <span style={{ fontWeight: "600" }}>Slide #{idx + 1}</span>
                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                  <s-button
                                    icon="chevron-up"
                                    variant="tertiary"
                                    disabled={idx === 0}
                                    onClick={() => moveSlide(idx, -1)}
                                  />
                                  <s-button
                                    icon="chevron-down"
                                    variant="tertiary"
                                    disabled={idx === slides.length - 1}
                                    onClick={() => moveSlide(idx, 1)}
                                  />
                                  <s-button
                                    variant="tertiary"
                                    tone="critical"
                                    disabled={slides.length <= 1}
                                    onClick={() => removeSlide(slide.id)}
                                  >
                                    Delete
                                  </s-button>
                                  <s-button
                                    variant="secondary"
                                    onClick={() => setExpandedSlideId(isExpanded ? null : slide.id)}
                                  >
                                    {isExpanded ? "Collapse" : "Edit Details"}
                                  </s-button>
                                </div>
                              </div>
                              {isExpanded && renderSlideFields(slide)}
                            </s-box>
                          );
                        })
                      ) : (
                        renderSlideFields(slides[0] || defaultSlides[0])
                      )}

                      {barType === "multiple-slides" && (
                        <s-button variant="secondary" onClick={addSlide}>
                          Add new slide
                        </s-button>
                      )}
                    </s-stack>
                  </s-section>
                </>
              )}

              {/* 2. DESIGN TAB */}
              {activeTab === "design" && (
                <>
                  <s-section heading="Background">
                    <s-stack direction="block" gap="base">
                      <s-select
                        label="Style"
                        value={bgStyle}
                        onChange={(e: any) => setBgStyle(e.target.value)}
                      >
                        <s-option value="single">Single color</s-option>
                        <s-option value="gradient">Gradient</s-option>
                      </s-select>

                      {bgStyle === "single" ? (
                        <s-color-field
                          name="backgroundColor"
                          label="Background color"
                          value={backgroundColor}
                          onChange={(e: any) => setBackgroundColor(e.target.value)}
                        ></s-color-field>
                      ) : (
                        <s-text-field
                          label="Gradient CSS (e.g. linear-gradient(135deg, #11998e, #38ef7d))"
                          value={bgGradient}
                          onChange={(e: any) => setBgGradient(e.target.value)}
                        ></s-text-field>
                      )}

                      <s-select
                        label="Extra style/animation"
                        value={bgAnimation}
                        onChange={(e: any) => setBgAnimation(e.target.value)}
                      >
                        <s-option value="none">None</s-option>
                        <s-option value="pulse">Pulse opacity</s-option>
                        <s-option value="glow">Interior glow pulse</s-option>
                        <s-option value="slide">Sliding gradient</s-option>
                      </s-select>
                    </s-stack>
                  </s-section>

                  <s-section heading="Border">
                    <s-stack direction="block" gap="base">
                      <s-stack direction="inline" gap="base">
                        <div style={{ flex: 1 }}>
                          <s-number-field
                            label="Radius"
                            value={borderRadius.toString()}
                            onChange={(e: any) => setBorderRadius(Number(e.target.value || 0))}
                          ></s-number-field>
                        </div>
                        <div style={{ flex: 1 }}>
                          <s-number-field
                            label="Size"
                            value={borderSize.toString()}
                            onChange={(e: any) => setBorderSize(Number(e.target.value || 0))}
                          ></s-number-field>
                        </div>
                        <div style={{ flex: 1 }}>
                          <s-color-field
                            label="Color"
                            value={borderColor}
                            onChange={(e: any) => setBorderColor(e.target.value)}
                          ></s-color-field>
                        </div>
                      </s-stack>
                    </s-stack>
                  </s-section>

                  <s-section heading="Text">
                    <s-stack direction="block" gap="base">
                      <s-select
                        label="Font family"
                        value={fontFamily}
                        onChange={(e: any) => setFontFamily(e.target.value)}
                      >
                        <s-option value="inherit">Inherit from theme</s-option>
                        <s-option value="Inter, sans-serif">Inter</s-option>
                        <s-option value="Outfit, sans-serif">Outfit</s-option>
                        <s-option value="'Roboto Condensed', sans-serif">Roboto Condensed</s-option>
                        <s-option value="Arial, sans-serif">Arial</s-option>
                        <s-option value="Georgia, serif">Georgia</s-option>
                        <s-option value="monospace">Monospace</s-option>
                      </s-select>

                      <div style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}>
                        <div style={{ flex: 1 }}>
                          <s-number-field
                            label="Announcement text size (px)"
                            value={fontSize.toString()}
                            onChange={(e: any) => setFontSize(Number(e.target.value || 14))}
                          ></s-number-field>
                        </div>
                        <div style={{ flex: 1 }}>
                          <s-color-field
                            label="Color"
                            value={textColor}
                            onChange={(e: any) => setTextColor(e.target.value)}
                          ></s-color-field>
                        </div>
                        <div style={{ paddingBottom: 8 }}>
                          <s-checkbox
                            label="Make bold"
                            checked={fontBold}
                            onChange={(e: any) => setFontBold(e.target.checked)}
                          ></s-checkbox>
                        </div>
                      </div>


                      <h4 style={{ marginTop: 20 }}>Subtext Styling</h4>
                      <div style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}>
                        <div style={{ flex: 1 }}>
                          <s-number-field
                            label="Subtext Size (px)"
                            value={subtextFontSize.toString()}
                            onChange={(e: any) => setSubtextFontSize(Number(e.target.value || 14))}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <s-color-field
                            label="Subtext Color"
                            value={subtextColor}
                            onChange={(e: any) => setSubtextColor(e.target.value)}
                          />
                        </div>
                        <div style={{ paddingBottom: 8 }}>
                          <s-checkbox
                            label="Bold"
                            checked={subtextBold}
                            onChange={(e: any) => setSubtextBold(e.target.checked)}
                          />
                        </div>
                      </div>

                      <h4 style={{ marginTop: 20 }}>Button Text Styling</h4>
                      <div style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}>
                        <div style={{ flex: 1 }}>
                          <s-number-field
                            label="Button Text Size (px)"
                            value={buttonFontSize.toString()}
                            onChange={(e: any) => setButtonFontSize(Number(e.target.value || 12))}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <s-color-field
                            label="Button Text Color"
                            value={buttonTextColor}
                            onChange={(e: any) => setButtonTextColor(e.target.value)}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <s-color-field
                            label="Button Background Color"
                            value={buttonBgColor}
                            onChange={(e: any) => setButtonBgColor(e.target.value)}
                          />
                        </div>
                        <div style={{ paddingBottom: 8 }}>
                          <s-checkbox
                            label="Bold"
                            checked={buttonBold}
                            onChange={(e: any) => setButtonBold(e.target.checked)}
                          />
                        </div>
                      </div>

                      <s-select
                        label="Extra style/animation"
                        value={textAnimation}
                        onChange={(e: any) => setTextAnimation(e.target.value)}
                      >
                        <s-option value="none">None</s-option>
                        <s-option value="bounce">Subtle bounce</s-option>
                        <s-option value="shimmer">Text shimmer</s-option>
                        <s-option value="fade">Periodic fade</s-option>
                      </s-select>
                    </s-stack>
                  </s-section>

                  <s-section heading="Theme presets">
                    <s-text color="subdued">Apply a theme to instantly update your colors and styling details.</s-text>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginTop: 12 }}>
                      {[
                        { name: "Black", bg: "#000000", color: "#ffffff" },
                        { name: "Dark blue", bg: "#1a365d", color: "#ffffff" },
                        { name: "Dark green", bg: "#1c4532", color: "#ffffff" },
                        { name: "Dark orange", bg: "#7b341e", color: "#ffffff" },
                        { name: "Dark purple", bg: "#44337a", color: "#ffffff" },
                        { name: "Dark red", bg: "#9b2c2c", color: "#ffffff" },
                        { name: "Green gradient", bg: "linear-gradient(135deg, #11998e, #38ef7d)", color: "#ffffff" },
                        { name: "Sunset gradient", bg: "linear-gradient(135deg, #f12711, #f5af19)", color: "#ffffff" },
                        { name: "Purple gradient", bg: "linear-gradient(135deg, #8a2387, #e94057, #f27121)", color: "#ffffff" },
                      ].map((preset) => (
                        <div
                          key={preset.name}
                          onClick={() => applyThemePreset(preset.name)}
                          style={{
                            border: "1px solid #dfe3e8",
                            borderRadius: 8,
                            overflow: "hidden",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
                        >
                          <div style={{ background: preset.bg, color: preset.color, padding: "12px 8px", textAlign: "center", fontSize: 11, fontWeight: "600" }}>
                            Welcome to my store!
                          </div>
                          <div style={{ padding: "8px 12px", background: "#ffffff", fontSize: 12, fontWeight: "600", textAlign: "center", borderTop: "1px solid #dfe3e8", color: "#202223" }}>
                            {preset.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </s-section>

                  <s-section heading="Miscellaneous">
                    <s-stack direction="block" gap="base">
                      <s-checkbox
                        label="Add custom CSS"
                        checked={customCssEnabled}
                        onChange={(e: any) => setCustomCssEnabled(e.target.checked)}
                      ></s-checkbox>
                      {customCssEnabled && (
                        <s-text-area
                          label="Custom CSS Rules"
                          name="customCss"
                          rows={4}
                          value={customCss}
                          onChange={(e: any) => setCustomCss(e.target.value)}
                          placeholder=".ab-inner { padding: 12px; }"
                        />
                      )}
                    </s-stack>
                  </s-section>

                  <s-section heading="Countdown Timer Design">
                    <s-stack direction="block" gap="base">
                      <s-select
                        label="Timer Position"
                        value={timerPosition}
                        onChange={(e: any) => setTimerPosition(e.target.value)}
                      >
                        <s-option value="default">Default (Flow with text)</s-option>
                        <s-option value="left">Left of text</s-option>
                        <s-option value="right">Right of text (before CTA button)</s-option>
                        <s-option value="left-corner">Left corner</s-option>
                        <s-option value="right-corner">Right corner</s-option>
                      
                      </s-select>

                      <div style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}>
                        <div style={{ flex: 1 }}>
                          <s-number-field
                            label="Timer Font Size (px)"
                            value={timerFontSize.toString()}
                            onChange={(e: any) => setTimerFontSize(Number(e.target.value || 14))}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <s-text-field
                            label="Timer Width (e.g. auto, 120)"
                            value={timerWidth}
                            onChange={(e: any) => setTimerWidth(e.target.value)}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <s-text-field
                            label="Timer Height (e.g. auto, 40)"
                            value={timerHeight}
                            onChange={(e: any) => setTimerHeight(e.target.value)}
                          />
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}>
                        <div style={{ flex: 1 }}>
                          <s-color-field
                            label="Timer Text Color"
                            value={timerTextColor}
                            onChange={(e: any) => setTimerTextColor(e.target.value)}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <s-text-field
                            label="Timer Background Color"
                            value={timerBgColor}
                            onChange={(e: any) => setTimerBgColor(e.target.value)}
                          />
                        </div>
                      </div>
                    </s-stack>
                  </s-section>

                  <s-section heading="Announcement Bar Spacing">
                    <s-stack direction="block" gap="base">
                      <div style={{ display: "flex", gap: "16px" }}>
                        <div style={{ flex: 1 }}>
                          <s-number-field
                            label="Top Padding (px)"
                            value={paddingTop.toString()}
                            onChange={(e: any) => setPaddingTop(Number(e.target.value || 0))}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <s-number-field
                            label="Bottom Padding (px)"
                            value={paddingBottom.toString()}
                            onChange={(e: any) => setPaddingBottom(Number(e.target.value || 0))}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <s-number-field
                            label="Top Margin (px)"
                            value={marginTop.toString()}
                            onChange={(e: any) => setMarginTop(Number(e.target.value || 0))}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <s-number-field
                            label="Bottom Margin (px)"
                            value={marginBottom.toString()}
                            onChange={(e: any) => setMarginBottom(Number(e.target.value || 0))}
                          />
                        </div>
                      </div>
                    </s-stack>
                  </s-section>
                </>
              )}

              {/* 3. PLACEMENT TAB */}
              {activeTab === "placement" && (
                <>
                  <s-section heading="General placement">
                    <s-stack direction="block" gap="base">
                      <s-select
                        label="Position"
                        value={position}
                        onChange={(e: any) => setPosition(e.target.value)}
                      >
                        <s-option value="top">Top of the page</s-option>
                        <s-option value="bottom">Bottom of the page</s-option>
                      </s-select>
                      <s-checkbox
                        label="Make the bar sticky (it will be visible even when scrolling)"
                        checked={sticky}
                        onChange={(e: any) => setSticky(e.target.checked)}
                      />
                    </s-stack>
                  </s-section>

                  <s-section heading="Display on">
                    <s-stack direction="block" gap="base">
                      <s-text color="subdued">
                        Show different bars based on page, product, or cart context.
                      </s-text>
                      <s-choice-list
                        name="scope"
                        label="Which pages should show this bar?"
                        values={[scope]}
                        onChange={(e: any) => setScope(e.target.values[0])}
                      >
                        <s-choice value="all">Every page</s-choice>
                        <s-choice value="selected">Selected pages only</s-choice>
                      </s-choice-list>

                      {scope === "selected" && (
                        <s-box padding="base" background="subdued" borderRadius="base">
                          <s-stack direction="block" gap="small-300">
                            {PAGE_OPTIONS.map((opt) => (
                              <s-checkbox
                                key={opt.value}
                                label={`${opt.label} — ${opt.hint}`}
                                checked={selectedPages.includes(opt.value)}
                                onChange={() => togglePage(opt.value)}
                              ></s-checkbox>
                            ))}
                            {selectedPages.includes("custom") && (
                              <s-text-field
                                name="customPageUrl"
                                label="Custom page URL"
                                placeholder="/pages/shipping-info"
                                value={customPageUrl}
                                onChange={(e: any) => setCustomPageUrl(e.target.value)}
                              ></s-text-field>
                            )}
                          </s-stack>
                        </s-box>
                      )}
                    </s-stack>
                  </s-section>

                  <s-section heading="Country targeting">
                    <s-stack direction="block" gap="base">
                      <s-text color="subdued">
                        Show this bar only to shoppers browsing from specific countries.
                      </s-text>
                      <s-choice-list
                        name="locationScope"
                        label="Which locations should see this bar?"
                        values={[locationScope]}
                        onChange={(e: any) => setLocationScope(e.target.values[0])}
                      >
                        <s-choice value="all">In any country / locale</s-choice>
                        <s-choice value="selected">In specific countries</s-choice>
                      </s-choice-list>

                      {locationScope === "selected" && (
                        <s-box padding="base" background="subdued" borderRadius="base">
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {COUNTRY_OPTIONS.map((opt) => (
                              <div key={opt.value} style={{ minWidth: 190 }}>
                                <s-checkbox
                                  label={opt.label}
                                  checked={selectedCountries.includes(opt.value)}
                                  onChange={() => toggleCountry(opt.value)}
                                ></s-checkbox>
                              </div>
                            ))}
                          </div>
                          <s-text color="subdued">
                            {selectedCountries.length === 0
                              ? "Select at least one country, or the bar won't show anywhere."
                              : `Showing to: ${selectedCountries.join(", ")}`}
                          </s-text>
                        </s-box>
                      )}
                    </s-stack>
                  </s-section>

                  <s-section heading="Customer targeting">
                    <s-stack direction="block" gap="base">
                      <s-choice-list
                        label="Show the announcement bar:"
                        values={[customerTargetingType]}
                        onChange={(e: any) => setCustomerTargetingType(e.target.values[0])}
                      >
                        <s-choice value="all">To any customer</s-choice>
                        <s-choice value="tags">To customers with specific tags</s-choice>
                        <s-choice value="spend">To customers over a certain lifetime spend</s-choice>
                      </s-choice-list>

                      {customerTargetingType === "tags" && (
                        <s-text-field
                          label="Customer Tags (comma separated)"
                          placeholder="VIP, gold-member"
                          value={customerTargetingTags}
                          onChange={(e: any) => setCustomerTargetingTags(e.target.value)}
                        />
                      )}

                      {customerTargetingType === "spend" && (
                        <s-number-field
                          label="Minimum lifetime spend"
                          placeholder="100.00"
                          value={customerTargetingSpend.toString()}
                          onChange={(e: any) => setCustomerTargetingSpend(Number(e.target.value || 0))}
                        />
                      )}
                    </s-stack>
                  </s-section>

                  <s-section heading="Schedule campaign">
                    <s-stack direction="block" gap="base">
                      <s-checkbox
                        label="Schedule automatic start and end times"
                        checked={scheduleEnabled}
                        onChange={(e: any) => setScheduleEnabled(e.target.checked)}
                      ></s-checkbox>
                      {scheduleEnabled && (
                        <s-box padding="base" background="subdued" borderRadius="base">
                          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {/* Timezone Selector */}
                            <div>
                              <label htmlFor="timezone" style={{ display: "block", fontSize: 13, marginBottom: 4, fontWeight: "500" }}>
                                Scheduling Timezone
                              </label>
                              <select
                                id="timezone"
                                name="timezone"
                                value={timezone}
                                onChange={(e) => setTimezone(e.target.value)}
                                style={{
                                  padding: "6px 8px",
                                  borderRadius: 6,
                                  border: "1px solid #c9cccf",
                                  width: "100%",
                                  background: "#fff",
                                  fontSize: 13,
                                }}
                              >
                                <option value="UTC">UTC / Coordinated Universal Time</option>
                                <option value="America/New_York">America/New_York (Eastern Time)</option>
                                <option value="America/Chicago">America/Chicago (Central Time)</option>
                                <option value="America/Denver">America/Denver (Mountain Time)</option>
                                <option value="America/Los_Angeles">America/Los_Angeles (Pacific Time)</option>
                                <option value="Europe/London">Europe/London (London/GMT)</option>
                                <option value="Europe/Paris">Europe/Paris (Paris/CET)</option>
                                <option value="Asia/Tokyo">Asia/Tokyo (Japan Standard Time)</option>
                                <option value="Asia/Kolkata">Asia/Kolkata (India Standard Time)</option>
                                <option value="Asia/Singapore">Asia/Singapore (Singapore Standard Time)</option>
                                <option value="Australia/Sydney">Australia/Sydney (Sydney Time)</option>
                              </select>
                            </div>

                            <ScheduleDateTimeField
                              id="startAt"
                              name="startAt"
                              label="Starts at (optional)"
                              initialValue={
                                announcement?.startAt
                                  ? utcToLocal(new Date(announcement.startAt), timezone)
                                  : ""
                              }
                            />

                            <s-checkbox
                              label="Set an end date"
                              checked={endDateEnabled}
                              onChange={(e: any) => setEndDateEnabled(e.target.checked)}
                            ></s-checkbox>

                            {endDateEnabled ? (
                              <ScheduleDateTimeField
                                id="endAt"
                                name="endAt"
                                label="Ends at"
                                initialValue={
                                  announcement?.endAt
                                    ? utcToLocal(new Date(announcement.endAt), timezone)
                                    : ""
                                }
                              />
                            ) : (
                              <input type="hidden" id="endAt" name="endAt" value="" />
                            )}

                            <s-text color="subdued">
                              Leave the start date blank to run immediately. Campaign dates are
                              evaluated in the chosen timezone.
                            </s-text>
                          </div>
                        </s-box>
                      )}
                    </s-stack>
                  </s-section>
                </>
              )}

              {/* Form Actions */}
              <s-stack direction="inline" gap="base">
                <s-button variant="primary" type="submit" loading={isSaving || undefined}>
                  {isNew ? "Create announcement" : "Save changes"}
                </s-button>
              </s-stack>

            </s-stack>
          </div>

          {/* Right Preview Pane (Sticky/Fixed look) */}
          <div style={{ flex: "1 1 280px", minWidth: 0 }}>
            <div style={{ position: "sticky", top: 20 }}>
              <s-section heading="Live Preview">
                <s-stack direction="block" gap="base">
                  <div
                    style={{
                      width: "100%",
                      borderRadius: borderRadius || 0,
                      border: borderSize > 0 ? `${borderSize}px solid ${borderColor}` : "none",
                      background: bgStyle === "single" ? backgroundColor : bgGradient,
                      color: textColor,
                      paddingLeft: "14px",
                      paddingRight: "14px",
                      paddingTop: `${paddingTop}px`,
                      paddingBottom: `${paddingBottom}px`,
                      marginTop: `${marginTop}px`,
                      marginBottom: `${marginBottom}px`,
                      boxSizing: "border-box",
                      fontFamily: fontFamily === "inherit" ? "inherit" : fontFamily,
                      fontSize: `${fontSize}px`,
                      fontWeight: fontBold ? "bold" : "normal",
                      textAlign: isSplitLayout ? (isSplitTextLeft ? "left" : "right") : "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isSplitLayout ? (isSplitTextLeft ? "flex-start" : "flex-end") : "center",
                      justifyContent: "center",
                      minHeight: 50,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      position: "relative",
                    }}
                  >
                    {barType === "multiple-slides" && sliderShowArrows && sliderArrowsPosition === "corners" && (
                      <button
                        type="button"
                        onClick={() => setPreviewSlideIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
                        style={{
                          position: "absolute",
                          left: "8px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          color: textColor,
                          cursor: "pointer",
                          padding: 4,
                          display: "flex",
                          alignItems: "center",
                          zIndex: 2,
                          fontSize: "14px",
                          fontWeight: "bold",
                        }}
                      >
                        &#10094;
                      </button>
                    )}
                    {barType === "multiple-slides" && sliderShowArrows && sliderArrowsPosition === "corners" && (
                      <button
                        type="button"
                        onClick={() => setPreviewSlideIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1))}
                        style={{
                          position: "absolute",
                          right: "8px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          color: textColor,
                          cursor: "pointer",
                          padding: 4,
                          display: "flex",
                          alignItems: "center",
                          zIndex: 2,
                          fontSize: "14px",
                          fontWeight: "bold",
                        }}
                      >
                        &#10095;
                      </button>
                    )}
                    {activePreviewSlide.countdownEnabled && !activePreviewSlide.countdownPlaceInText && (timerPosition === "left-corner" || timerPosition === "right-corner") && (
                      <span
                        style={{
                          position: "absolute",
                          left: timerPosition === "left-corner" ? "14px" : "auto",
                          right: timerPosition === "right-corner" ? "14px" : "auto",
                          top: "50%",
                          transform: "translateY(-50%)",
                          display: "inline-flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                          padding: timerBgColor ? "4px 8px" : "0",
                          borderRadius: 4,
                          backgroundColor: timerBgColor || "transparent",
                          color: timerTextColor || textColor,
                          fontSize: `${timerFontSize}px`,
                          width: timerWidth && timerWidth !== "auto" ? (isNaN(Number(timerWidth)) ? timerWidth : `${timerWidth}px`) : "auto",
                          height: timerHeight && timerHeight !== "auto" ? (isNaN(Number(timerHeight)) ? timerHeight : `${timerHeight}px`) : "auto",
                          zIndex: 1,
                        }}
                      >
                        {activePreviewSlide.countdownLabel && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: "600", textTransform: "uppercase", marginBottom: "2px", opacity: 0.9 }}>
                            <span>{activePreviewSlide.countdownLabel}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block" }}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                          </span>
                        )}
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
                            <span style={{ fontWeight: "bold" }}>02</span>
                            <span style={{ fontSize: "8px", opacity: 0.8 }}>{activePreviewSlide.countdownLabelsDays || "d"}</span>
                          </span>
                          <span>:</span>
                          <span style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
                            <span style={{ fontWeight: "bold" }}>14</span>
                            <span style={{ fontSize: "8px", opacity: 0.8 }}>{activePreviewSlide.countdownLabelsHours || "h"}</span>
                          </span>
                          <span>:</span>
                          <span style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
                            <span style={{ fontWeight: "bold" }}>35</span>
                            <span style={{ fontSize: "8px", opacity: 0.8 }}>{activePreviewSlide.countdownLabelsMins || "m"}</span>
                          </span>
                          <span>:</span>
                          <span style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
                            <span style={{ fontWeight: "bold" }}>19</span>
                            <span style={{ fontSize: "8px", opacity: 0.8 }}>{activePreviewSlide.countdownLabelsSecs || "s"}</span>
                          </span>
                        </span>
                      </span>
                    )}

                    {(timerPosition === "left" || timerPosition === "right") ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "20px",
                          width: "100%",
                          flexWrap: "wrap",
                        }}
                      >
                        {timerPosition === "left" && renderPreviewCountdown(-1)}

                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            textAlign: "center",
                            order: 0,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: "8px" }}>
                            {barType === "multiple-slides" && sliderShowArrows && sliderArrowsPosition === "near-text" && (
                              <button
                                type="button"
                                onClick={() => setPreviewSlideIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: textColor,
                                  cursor: "pointer",
                                  padding: "0 8px",
                                  display: "flex",
                                  alignItems: "center",
                                  order: -2,
                                  fontSize: "14px",
                                  fontWeight: "bold",
                                }}
                              >
                                &#10094;
                              </button>
                            )}
                            {getPreviewEmoji(activePreviewSlide)}
                            <span style={{ order: 0 }} dangerouslySetInnerHTML={{ __html: getPreviewText(activePreviewSlide) }} />
                            {activePreviewSlide.ctaEnabled && activePreviewSlide.ctaLink && activePreviewSlide.ctaType === "button" && (
                              <button
                                type="button"
                                style={{
                                  background: buttonBgColor || textColor,
                                  color: buttonTextColor,
                                  border: "none",
                                  padding: "3px 8px",
                                  borderRadius: 4,
                                  fontSize: `${buttonFontSize}px`,
                                  fontWeight: buttonBold ? "bold" : "normal",
                                  marginLeft: 8,
                                  cursor: "pointer",
                                  order: 3,
                                }}
                              >
                                {activePreviewSlide.ctaText || "Click"}
                              </button>
                            )}
                            {barType === "multiple-slides" && sliderShowArrows && sliderArrowsPosition === "near-text" && (
                              <button
                                type="button"
                                onClick={() => setPreviewSlideIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1))}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: textColor,
                                  cursor: "pointer",
                                  padding: "0 8px",
                                  display: "flex",
                                  alignItems: "center",
                                  order: 4,
                                  fontSize: "14px",
                                  fontWeight: "bold",
                                }}
                              >
                                &#10095;
                              </button>
                            )}
                          </div>
                          {activePreviewSlide.subtext && (
                            <div
                              style={{
                                fontSize: `${subtextFontSize}px`,
                                color: subtextColor,
                                fontWeight: subtextBold ? "bold" : "normal",
                                marginTop: 2,
                              }}
                            >
                              {activePreviewSlide.subtext}
                            </div>
                          )}
                        </div>

                        {timerPosition === "right" && renderPreviewCountdown(2)}
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: isSplitLayout ? "space-between" : "center", flexWrap: "wrap", width: "100%" }}>
                          {barType === "multiple-slides" && sliderShowArrows && sliderArrowsPosition === "near-text" && (
                            <button
                              type="button"
                              onClick={() => setPreviewSlideIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
                              style={{
                                background: "none",
                                border: "none",
                                color: textColor,
                                cursor: "pointer",
                                padding: "0 8px",
                                display: "flex",
                                alignItems: "center",
                                order: -2,
                                fontSize: "14px",
                                fontWeight: "bold",
                              }}
                            >
                              &#10094;
                            </button>
                          )}
                          {getPreviewEmoji(activePreviewSlide)}
                          <span style={{ order: 0 }} dangerouslySetInnerHTML={{ __html: getPreviewText(activePreviewSlide) }} />
                          {activePreviewSlide.countdownEnabled && !activePreviewSlide.countdownPlaceInText && timerPosition !== "left-corner" && timerPosition !== "right-corner" && renderPreviewCountdown()}
                          {activePreviewSlide.ctaEnabled && activePreviewSlide.ctaLink && activePreviewSlide.ctaType === "button" && (
                            <button
                              type="button"
                              style={{
                                background: buttonBgColor || textColor,
                                color: buttonTextColor,
                                border: "none",
                                padding: "3px 8px",
                                borderRadius: 4,
                                fontSize: `${buttonFontSize}px`,
                                fontWeight: buttonBold ? "bold" : "normal",
                                marginLeft: 8,
                                cursor: "pointer",
                                order: 3,
                              }}
                            >
                              {activePreviewSlide.ctaText || "Click"}
                            </button>
                          )}
                          {barType === "multiple-slides" && sliderShowArrows && sliderArrowsPosition === "near-text" && (
                            <button
                              type="button"
                              onClick={() => setPreviewSlideIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1))}
                              style={{
                                background: "none",
                                border: "none",
                                color: textColor,
                                cursor: "pointer",
                                padding: "0 8px",
                                display: "flex",
                                alignItems: "center",
                                order: 4,
                                fontSize: "14px",
                                fontWeight: "bold",
                              }}
                            >
                              &#10095;
                            </button>
                          )}
                        </div>
                        {activePreviewSlide.subtext && (
                          <div style={{
                            fontSize: `${subtextFontSize}px`,
                            color: subtextColor,
                            fontWeight: subtextBold ? "bold" : "normal",
                            marginTop: 2,
                            textAlign: isSplitTextLeft ? "left" : (isSplitTimerLeft ? "right" : "center"),
                            alignSelf: isSplitTextLeft ? "flex-start" : (isSplitTimerLeft ? "flex-end" : "center"),
                          }}>
                            {activePreviewSlide.subtext}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {barType === "multiple-slides" && (
                    <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                      {slides.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPreviewSlideIndex(idx)}
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            border: "none",
                            padding: 0,
                            background: previewSlideIndex === idx ? "#1a1a1a" : "#c9cccf",
                            cursor: "pointer",
                          }}
                        />
                      ))}
                    </div>
                  )}

                  <s-box padding="base" background="subdued" borderRadius="base">
                    <s-stack direction="block" gap="small-200">
                      <s-text type="strong">Device Position</s-text>
                      <s-text color="subdued">
                        Position: {position === "top" ? "Top banner" : "Bottom banner"}
                        {sticky ? " (Sticky active)" : " (Scrolls with page)"}
                      </s-text>
                    </s-stack>
                  </s-box>
                </s-stack>
              </s-section>
            </div>
          </div>
        </s-stack>
      </form>
    </s-page>
  );
}