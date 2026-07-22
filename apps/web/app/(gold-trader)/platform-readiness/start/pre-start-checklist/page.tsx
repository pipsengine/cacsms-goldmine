import type { Metadata } from "next";
import { PreStartChecklistPage } from "@/components/platform-readiness/pre-start-checklist-page";

export const metadata: Metadata = {
  title: "Pre-Start Checklist | CACSMS Goldmine",
};

export default function Page() {
  return <PreStartChecklistPage />;
}
