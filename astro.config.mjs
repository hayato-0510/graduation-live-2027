// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

// https://astro.new/config
export default defineConfig({
  integrations: [react()],
});
