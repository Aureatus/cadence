import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { RootLayout } from "@/components/layout/root-layout";
import { Dashboard } from "@/features/dashboard/dashboard";
import { HistoryPage } from "@/features/history/history-page";
import { dashboardSearchSchema } from "@/lib/filter";

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Dashboard,
  validateSearch: dashboardSearchSchema,
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/history",
  component: HistoryPage,
});

const routeTree = rootRoute.addChildren([indexRoute, historyRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
