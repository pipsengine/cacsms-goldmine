import type { Metadata } from "next";
import { ConfigurationLoadingPage } from "@/components/platform-readiness/configuration-loading-page";

export const metadata: Metadata = { title: "Configuration Loading | Gold Trader" };

export default function Page() {
  return <ConfigurationLoadingPage />;
}
