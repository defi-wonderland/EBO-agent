import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true, // Use Vitest's global API without importing it in each file
        environment: "node", // Use the Node.js environment
        include: ["tests/**/*.spec.ts"], // Include test files
        exclude: ["node_modules", "dist"], // Exclude certain directories
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"], // Coverage reporters
            exclude: ["node_modules", "dist", "src/**/*.d.ts"], // Files to exclude from coverage
        },
    },
    resolve: {
        alias: {
            // Setup path alias based on tsconfig paths
            "@": path.resolve(__dirname, "src"),
        },
    },
});
