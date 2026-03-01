module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  },
  extends: ["eslint:recommended", "prettier"],
  ignorePatterns: ["dist", ".next", "node_modules", "coverage", "apps/api/generated"]
};

