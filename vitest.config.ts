import { configDefaults, defineConfig } from "vitest/config";

// Las pruebas E2E (e2e/) las corre Playwright, no Vitest.
export default defineConfig({
  test: { exclude: [...configDefaults.exclude, "e2e/**", ".e2e-supabase/**"] },
});
