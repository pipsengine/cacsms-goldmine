import type { Metadata } from "next";
import { OperatingModePage } from "@/components/platform-readiness/operating-mode-page";

export const metadata: Metadata = {
  title: "Operating Mode | Gold Trader",
};

export default function Page() {
  return <OperatingModePage />;
}
