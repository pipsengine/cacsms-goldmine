import type { Metadata } from "next";
import { AiAgentInitializationPage } from "@/components/platform-readiness/ai-agent-initialization-page";

export const metadata: Metadata = {
  title: "AI Agent Initialization | Gold Trader",
};

export default function Page() {
  return <AiAgentInitializationPage />;
}
