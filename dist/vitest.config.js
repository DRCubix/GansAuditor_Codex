import { defineConfig } from 'vitest/config';
export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.ts'],
        exclude: ['node_modules', 'dist', '.mcp-gan-state'],
        testTimeout: 30000, // Increase timeout for integration tests
        hookTimeout: 30000,
    },
});
//# sourceMappingURL=vitest.config.js.map