import type { Metadata } from "next";
import { StartupHistoryPage } from "@/components/platform-readiness/startup-history-page";

export const metadata: Metadata = {
  title: "Startup History | CACSMS Goldmine",
};

export default function Page() {
  return <StartupHistoryPage />;
}
