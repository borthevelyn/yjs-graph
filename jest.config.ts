const jestConfig = {
    verbose: true,
    silent: true,
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!**/vendor/**'],
    coverageDirectory: 'coverage',
    // testEnvironment: 'tsdom',
    testEnvironment: 'node',
    transform: {
    ".(ts|tsx)": ["ts-jest", { diagnostics: true, tsconfig: 'tsconfig.json' }]
    },
    preset: 'ts-jest',
    coveragePathIgnorePatterns: [
    "/node_modules/",
    "/coverage",
    "package.json",
    "package-lock.json",
    "reportWebVitals.ts",
    "setupTests.ts",
    "index.tsx"
    ],
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
};

export default jestConfig;