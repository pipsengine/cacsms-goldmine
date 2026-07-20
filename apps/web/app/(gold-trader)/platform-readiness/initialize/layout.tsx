import { InitializeStageBoundary } from "@/components/platform-readiness/initialize-stage-boundary";

export default function InitializeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <InitializeStageBoundary>{children}</InitializeStageBoundary>;
}
