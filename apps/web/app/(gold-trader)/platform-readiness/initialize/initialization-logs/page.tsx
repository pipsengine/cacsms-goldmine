import type { Metadata } from "next";
import { InitializationLogsPage } from "@/components/platform-readiness/initialization-logs-page";

export const metadata: Metadata = { title: "Initialization Logs | CACSMS Goldmine" };

export default function Page() {
  return <InitializationLogsPage />;
}
