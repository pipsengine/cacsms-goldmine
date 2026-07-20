import type { Metadata } from "next";
import { ServiceInitializationPage } from "@/components/platform-readiness/service-initialization-page";

export const metadata: Metadata = {
  title: "Service Initialization | Gold Trader",
};

export default function Page() {
  return <ServiceInitializationPage />;
}
