import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

// eslint-config-next 16.2.x ships native flat configs, so we import them
// directly instead of going through FlatCompat. FlatCompat routes through
// @eslint/eslintrc's legacy validator, which crashes ("Converting circular
// structure to JSON") on eslint-plugin-react's modern self-referential config.
// Mirrors the HQ fix in gravixar-hq#154.
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    // React-Compiler-era react-hooks rules ship error-by-default in
    // eslint-config-next 16.2.x and flag pre-existing patterns this codebase
    // predates (e.g. closing nav menus via setState in a pathname effect).
    // Downgraded to warn to keep a green baseline; track for incremental
    // cleanup rather than blocking the repo. Mirrors gravixar-hq#154.
    rules: {
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  {
    ignores: [".next/", "node_modules/", "out/"],
  },
];

export default eslintConfig;
