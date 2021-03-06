module.exports = function(config) {
  config.set({
    files: [
      "test/**/*.ts",
      "src/**/*.ts"
    ],
    testRunner: "mocha",
    mochaOptions: {
      files: ["test/**/*.ts", "src/**/*.ts"],
      opts: "test/mocha.opts"
    },
    mutator: "typescript",
    reporters: ["clear-text", "progress", "html"],
    testFramework: "mocha",
    coverageAnalysis: "off",
    tsconfigFile: "tsconfig.json",
    thresholds: { high: 90, low: 70, break: 75 },
    mutate: [
      "src/**/*.ts",
      "!**/model/*"
    ]
  });
};
