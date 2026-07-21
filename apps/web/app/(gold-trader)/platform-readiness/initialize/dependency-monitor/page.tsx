import type { Metadata } from "next";
import { DependencyMonitorPage } from "@/components/platform-readiness/dependency-monitor-page";

export const metadata: Metadata = { title: "Dependency Monitor | Gold Trader" };
export const dynamic = "force-dynamic";

export default function Page() {
  return <DependencyMonitorPage />;
}
