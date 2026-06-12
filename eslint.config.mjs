// Marketing ESLint — consumes the canonical Gravixar flat config from the
// shared @gravixar-sv/core package (was a hand-maintained coreWebVitals +
// typescript spread; this kills the per-repo eslint drift the fleet-dep-drift
// sensor measures).
//
// withOverrides() = the shared base (Next core-web-vitals + TypeScript +
// GRAVIXAR_IGNORES) extended with marketing's react-hooks downgrades. The
// shared globalIgnores already covers .next / out / build / next-env.d.ts, and
// eslint ignores node_modules by default — so the previous explicit ignores
// block is no longer needed.
//
// Re-lands marketing#53 cleanly post-#76 (which already brought the
// @gravixar-sv/core dependency + .npmrc): this file is the ONLY change left.
import { withOverrides } from "@gravixar-sv/core/eslint";

export default withOverrides({
  // React-Compiler-era react-hooks rules ship error-by-default in
  // eslint-config-next 16.2.x and flag pre-existing patterns this codebase
  // predates (e.g. closing nav menus via setState in a pathname effect).
  // Downgraded to warn to keep a green baseline; track for incremental cleanup.
  rules: {
    "react-hooks/purity": "warn",
    "react-hooks/set-state-in-effect": "warn",
    "react-hooks/immutability": "warn",
  },
});
