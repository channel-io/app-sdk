import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
        },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      // Allow generic type parameters (common in SDK APIs)
      "@typescript-eslint/no-unnecessary-type-parameters": "off",
      // Allow numbers and undefined in template literals
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowNumber: true,
          allowNullish: true,
        },
      ],
      // Allow static-only classes (common in NestJS modules)
      "@typescript-eslint/no-extraneous-class": "off",
      // Allow namespaces for module augmentation
      "@typescript-eslint/no-namespace": "off",
      // Allow confusing void expressions in certain contexts
      "@typescript-eslint/no-confusing-void-expression": [
        "error",
        {
          ignoreArrowShorthand: true,
          ignoreVoidOperator: true,
        },
      ],
      // Relax unsafe rules for SDK development (proper typing should be enforced in types)
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      // Prefer nullish coalescing but allow logical or in some cases
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
    },
  },
  {
    files: ["packages/wam-ui/src/**/*.{ts,tsx}"],
    rules: {
      // wam-ui intentionally wraps Bezier component exports during the v4 prerelease.
      // A beta-component migration should happen separately from the v4 peer rollout.
      "@typescript-eslint/no-deprecated": "off",
    },
  },
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/*.js",
      "**/*.mjs",
      "**/*.cjs",
      "**/__tests__/**",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/vitest.config.ts",
    ],
  }
);
