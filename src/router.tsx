import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { RootLayout } from "@/components/layout/root-layout";
import { Dashboard } from "@/features/dashboard/dashboard";
import { HistoryPage } from "@/features/history/history-page";
import { SettingsPage } from "@/features/settings/settings-page";

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Dashboard,
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/history",
  component: HistoryPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([indexRoute, historyRoute, settingsRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
