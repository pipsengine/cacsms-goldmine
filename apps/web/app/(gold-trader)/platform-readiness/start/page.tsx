import type { Metadata } from "next";
import { StartPage } from "@/components/platform-readiness/start-page";

export const metadata: Metadata = {
  title: "Start | CACSMS Goldmine",
};

export default function Page() {
  return <StartPage />;
}
