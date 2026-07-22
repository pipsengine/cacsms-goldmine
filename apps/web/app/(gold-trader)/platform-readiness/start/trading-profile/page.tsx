import type { Metadata } from "next";
import { TradingProfilePage } from "@/components/platform-readiness/trading-profile-page";

export const metadata: Metadata = {
  title: "Trading Profile | CACSMS Goldmine",
};

export default function Page() {
  return <TradingProfilePage />;
}
