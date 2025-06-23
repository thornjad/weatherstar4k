import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    ignores: [
      "weatherstar/js/vendor/**/*"
    ],
  },
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2022,
        RegionalCities: "readonly",
        TravelCities: "readonly",
        StationInfo: "readonly",
        SunCalc: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "error",
      "no-undef": "error",
      curly: "error",
      "default-case": "error",
      eqeqeq: "error",
      "guard-for-in": "off",
      "id-denylist": [
        "error",
        "any",
        "Number",
        "String",
        "string",
        "Boolean",
        "boolean",
        "Undefined",
        "undefined",
      ],
      "id-match": "error",
      "max-classes-per-file": ["error", 3],
      "new-parens": "error",
      "no-bitwise": "error",
      "no-caller": "error",
      "no-cond-assign": "error",
      "no-debugger": "error",
      "no-eval": "error",
      "no-multiple-empty-lines": [
        "error",
        {
          max: 3,
        },
      ],
      "no-multi-spaces": "error",
      "no-new-wrappers": "error",
      "no-underscore-dangle": "off",
      "no-unused-expressions": "error",
      "no-unused-labels": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "one-var": ["error", "never"],
      "prefer-arrow-callback": [
        "error",
        {
          allowNamedFunctions: true,
        },
      ],
      "prefer-const": "error",
      "spaced-comment": [
        "error",
        "always",
        {
          exceptions: ["*"],
        },
      ],
      "sort-imports": [
        "error",
        { ignoreDeclarationSort: true, ignoreCase: true },
      ],
      "sort-keys": "off",
      "use-isnan": "error",
    },
  },
  {
    files: ["weatherstar/js/**/*.js"],
  },
];
