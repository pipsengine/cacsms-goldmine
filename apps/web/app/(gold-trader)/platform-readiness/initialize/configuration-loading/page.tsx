import type { Metadata } from "next";
import { ConfigurationLoadingPage } from "@/components/platform-readiness/configuration-loading-page";

export const metadata: Metadata = { title: "Configuration Loading | CACSMS Goldmine" };

export default function Page() {
  return <ConfigurationLoadingPage />;
}
