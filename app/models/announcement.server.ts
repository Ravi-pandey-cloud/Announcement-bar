import prisma from "../db.server";
import { serializeCountries, serializePages, localToUtc, type AnnouncementInput } from "./announcement.shared";

export async function listAnnouncements(shop: string) {
  return prisma.announcement.findMany({
    where: { shop },
    orderBy: { order: "asc" },
    include: {
      analytics: true,
    },
  });
}

export async function getAnnouncement(shop: string, id: string) {
  return prisma.announcement.findFirst({
    where: { shop, id },
    include: {
      analytics: true,
    },
  });
}

function toData(input: AnnouncementInput) {
  const tz = input.timezone || "UTC";
  return {
    name: input.name,
    message: input.message,
    enabled: input.enabled,
    displayPages: serializePages(input.displayPages),
    customPageUrl: input.customPageUrl || null,
    countries: serializeCountries(input.countries),
    linkUrl: input.linkUrl || null,
    linkText: input.linkText || null,
    backgroundColor: input.backgroundColor,
    textColor: input.textColor,
    rotationMode: input.rotationMode,
    bgStyle: input.bgStyle,
    bgGradient: input.bgGradient || "",
    bgAnimation: input.bgAnimation,
    borderRadius: input.borderRadius,
    borderSize: input.borderSize,
    borderColor: input.borderColor,
    fontFamily: input.fontFamily,
    fontSize: input.fontSize,
    fontBold: input.fontBold,
    textAnimation: input.textAnimation,
    customCss: input.customCss || "",
    startAt: input.startAt ? localToUtc(input.startAt, tz) : null,
    endAt: input.endAt ? localToUtc(input.endAt, tz) : null,
    countdownEnabled: input.countdownEnabled,
    countdownEndAt: input.countdownEndAt ? localToUtc(input.countdownEndAt, tz) : null,
    countdownExpiredMessage: input.countdownExpiredMessage || null,
    cartGoalEnabled: input.cartGoalEnabled,
    cartGoalAmount: input.cartGoalAmount ?? null,
    cartGoalMessage: input.cartGoalMessage || null,
    cartGoalAchievedMessage: input.cartGoalAchievedMessage || null,
    subtextFontSize: input.subtextFontSize,
    subtextColor: input.subtextColor,
    subtextBold: input.subtextBold,
    buttonFontSize: input.buttonFontSize,
    buttonTextColor: input.buttonTextColor,
    buttonBold: input.buttonBold,
    buttonBgColor: input.buttonBgColor,
    timerPosition: input.timerPosition,
    timerFontSize: input.timerFontSize,
    timerWidth: input.timerWidth,
    timerHeight: input.timerHeight,
    timerTextColor: input.timerTextColor,
    timerBgColor: input.timerBgColor,
    paddingTop: input.paddingTop,
    paddingBottom: input.paddingBottom,
    marginTop: input.marginTop,
    marginBottom: input.marginBottom,
    htmlContent: input.htmlContent || "",
    
    // Sleek features
    barType: input.barType,
    slideDuration: input.slideDuration,
    showCloseButton: input.showCloseButton,
    position: input.position,
    sticky: input.sticky,
    customerTargetingType: input.customerTargetingType,
    customerTargetingTags: input.customerTargetingTags,
    customerTargetingSpend: input.customerTargetingSpend,
    slidesJson: input.slidesJson,
    sliderShowArrows: input.sliderShowArrows,
    sliderArrowsPosition: input.sliderArrowsPosition,
    timezone: tz,
  };
}

export async function createAnnouncement(shop: string, input: AnnouncementInput) {
  const count = await prisma.announcement.count({ where: { shop } });
  return prisma.announcement.create({
    data: {
      shop,
      order: count,
      ...toData(input),
    },
  });
}

export async function updateAnnouncement(shop: string, id: string, input: AnnouncementInput) {
  return prisma.announcement.updateMany({
    where: { shop, id },
    data: toData(input),
  });
}

export async function deleteAnnouncement(shop: string, id: string) {
  return prisma.announcement.deleteMany({ where: { shop, id } });
}

export async function toggleAnnouncement(shop: string, id: string, enabled: boolean) {
  return prisma.announcement.updateMany({ where: { shop, id }, data: { enabled } });
}

export async function reorderAnnouncements(shop: string, orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.announcement.updateMany({
        where: { shop, id },
        data: { order: index },
      }),
    ),
  );
}

export async function trackViews(announcementIds: string[]) {
  if (announcementIds.length === 0) return;
  const todayStr = new Date().toISOString().slice(0, 10);
  
  await Promise.all(
    announcementIds.map(async (id) => {
      try {
        await prisma.announcementAnalytics.upsert({
          where: {
            announcementId_date: {
              announcementId: id,
              date: todayStr,
            },
          },
          update: {
            views: { increment: 1 },
          },
          create: {
            announcementId: id,
            date: todayStr,
            views: 1,
            clicks: 0,
          },
        });
      } catch (e) {
        console.error("Failed to track view for", id, e);
      }
    })
  );
}

export async function trackClick(announcementId: string) {
  const todayStr = new Date().toISOString().slice(0, 10);
  try {
    await prisma.announcementAnalytics.upsert({
      where: {
        announcementId_date: {
          announcementId,
          date: todayStr,
        },
      },
      update: {
        clicks: { increment: 1 },
      },
      create: {
        announcementId,
        date: todayStr,
        views: 0,
        clicks: 1,
      },
    });
  } catch (e) {
    console.error("Failed to track click for", announcementId, e);
  }
}

export async function getDashboardStats(
  shop: string,
  daysOrStartDate?: number | string,
  endDate?: string
) {
  const announcements = await prisma.announcement.findMany({
    where: { shop },
    select: { id: true },
  });

  const ids = announcements.map((a) => a.id);

  // Optional date-range filter for the main Views/Clicks stat cards.
  // When `daysOrStartDate` is omitted, stats reflect all-time totals (previous behavior).
  const dateFilter: any = {};
  if (daysOrStartDate) {
    if (typeof daysOrStartDate === "string") {
      dateFilter.gte = daysOrStartDate;
      if (endDate) {
        dateFilter.lte = endDate;
      }
    } else if (daysOrStartDate > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOrStartDate);
      dateFilter.gte = cutoffDate.toISOString().slice(0, 10);
    }
  }

  const aggregate = await prisma.announcementAnalytics.aggregate({
    where: {
      announcementId: { in: ids },
      ...(daysOrStartDate ? { date: dateFilter } : {}),
    },
    _sum: {
      views: true,
      clicks: true,
    },
  });

  // "Usage" (monthly quota) always reflects the current calendar month,
  // independent of the Views/Clicks date-range filter above.
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayStr = firstDayOfMonth.toISOString().slice(0, 10);
  
  const monthlyAggregate = await prisma.announcementAnalytics.aggregate({
    where: {
      announcementId: { in: ids },
      date: { gte: firstDayStr },
    },
    _sum: {
      views: true,
    },
  });

  return {
    totalViews: aggregate._sum.views || 0,
    totalClicks: aggregate._sum.clicks || 0,
    monthlyViews: monthlyAggregate._sum.views || 0,
  };
}

export async function getAnnouncementAnalytics(
  announcementId: string,
  daysOrStartDate: number | string = 30,
  endDate?: string
) {
  let dateQuery: any = {};

  if (typeof daysOrStartDate === "string") {
    dateQuery.gte = daysOrStartDate;
    if (endDate) {
      dateQuery.lte = endDate;
    }
  } else {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOrStartDate);
    const cutoffStr = cutoffDate.toISOString().slice(0, 10);
    dateQuery.gte = cutoffStr;
  }

  return prisma.announcementAnalytics.findMany({
    where: {
      announcementId,
      date: dateQuery,
    },
    orderBy: { date: "asc" },
  });
}
