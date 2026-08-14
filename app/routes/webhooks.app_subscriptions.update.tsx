import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload } = await authenticate.webhook(request);

  if (shop && payload) {
    const sub = (payload as any).app_subscription;
    if (sub) {
      const status = sub.status; // "ACTIVE", "CANCELLED", "EXPIRED", "DECLINED", "FROZEN"
      const name = sub.name || "Free";
      const subscriptionId = sub.admin_graphql_api_id || sub.id;

      if (status === "ACTIVE") {
        await prisma.shopPlan.upsert({
          where: { shop },
          update: {
            plan: name,
            subscriptionId: String(subscriptionId),
            status: "ACTIVE",
            viewLimit: name === "Unlimited" ? -1 : name === "Premium" ? 50000 : 2000,
          },
          create: {
            shop,
            plan: name,
            subscriptionId: String(subscriptionId),
            status: "ACTIVE",
            viewLimit: name === "Unlimited" ? -1 : name === "Premium" ? 50000 : 2000,
          },
        });
      } else if (["CANCELLED", "EXPIRED", "DECLINED", "FROZEN"].includes(status)) {
        await prisma.shopPlan.upsert({
          where: { shop },
          update: {
            plan: "Free",
            subscriptionId: null,
            status: status,
            viewLimit: 2000,
          },
          create: {
            shop,
            plan: "Free",
            subscriptionId: null,
            status: status,
            viewLimit: 2000,
          },
        });
      }
    }
  }

  return new Response();
};
