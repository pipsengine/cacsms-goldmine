import type { Metadata } from "next";
import { EngineInitializationPage } from "@/components/platform-readiness/engine-initialization-page";

export const metadata: Metadata = {
  title: "Engine Initialization | Gold Trader",
};

export default function Page() {
  return <EngineInitializationPage />;
}
