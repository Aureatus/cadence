import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import { router } from "./router.tsx";

registerSW({ immediate: true });

const root = createRoot(document.getElementById("root")!);

function mount() {
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}

if ("fonts" in document) {
  void Promise.race([
    document.fonts.ready,
    new Promise<void>((resolve) => {
      setTimeout(resolve, 1200);
    }),
  ]).then(mount);
} else {
  mount();
}
