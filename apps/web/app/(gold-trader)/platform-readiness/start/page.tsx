import type { Metadata } from "next";
import { StartPage } from "@/components/platform-readiness/start-page";

export const metadata: Metadata = {
  title: "Start | Gold Trader",
};

export default function Page() {
  return <StartPage />;
}
