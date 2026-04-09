import { WizVidLoader } from "./WizVidLoader";

/**
 * Shown while the dashboard auth check is in progress.
 * Uses the branded WizVid preloader instead of a generic skeleton.
 */
export function DashboardLayoutSkeleton() {
  return <WizVidLoader done={false} minDuration={400} />;
}
