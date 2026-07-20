import type { Metadata } from "next";
import { PreStartChecklistPage } from "@/components/platform-readiness/pre-start-checklist-page";

export const metadata: Metadata = {
  title: "Pre-Start Checklist | Gold Trader",
};

export default function Page() {
  return <PreStartChecklistPage />;
}
