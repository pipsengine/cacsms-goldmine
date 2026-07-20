import type { Metadata } from "next";
import { InitializePage } from "@/components/platform-readiness/initialize-page";

export const metadata: Metadata = {
  title: "Initialize | Gold Trader",
};

export default function Page() {
  return <InitializePage />;
}
