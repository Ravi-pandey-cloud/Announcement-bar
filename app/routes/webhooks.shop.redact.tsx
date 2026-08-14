import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop } = await authenticate.webhook(request);

  if (shop) {
    // Delete all shop-related data
    await db.announcement.deleteMany({ where: { shop } });
    await db.shopPlan.deleteMany({ where: { shop } });
    await db.session.deleteMany({ where: { shop } });
    // AnnouncementAnalytics is deleted via Cascade because of foreign key to Announcement
  }

  return new Response();
};
