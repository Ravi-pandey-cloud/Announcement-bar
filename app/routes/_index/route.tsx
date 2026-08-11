import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

// The root index route simply redirects to the embedded app dashboard.
// When Shopify opens the app (with or without ?shop= params), this sends
// merchants straight into the authenticated `/app` route which handles
// the full OAuth/session flow via authenticate.admin().
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const searchParams = url.searchParams.toString();
  throw redirect(`/app${searchParams ? `?${searchParams}` : ""}`);
};
