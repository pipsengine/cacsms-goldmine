import type { Metadata } from "next";
import { RiskProfilePage } from "@/components/platform-readiness/risk-profile-page";

export const metadata: Metadata = {
  title: "Risk Profile | CACSMS Goldmine",
};

export default function Page() {
  return <RiskProfilePage />;
}
