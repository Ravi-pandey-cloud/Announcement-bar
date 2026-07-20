import { data } from "react-router";
export async function loader() {
  return Response.json({
    message: "Hello",
  });
}