import type { Metadata } from "next";
import { StartupHistoryPage } from "@/components/platform-readiness/startup-history-page";

export const metadata: Metadata = {
  title: "Startup History | Gold Trader",
};

export default function Page() {
  return <StartupHistoryPage />;
}
