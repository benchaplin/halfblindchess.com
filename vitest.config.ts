import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],
        // integration tests boot the real server; give them room and run
        // serially so they don't fight over ports/redis
        testTimeout: 15000,
        hookTimeout: 20000,
        // neutralize rate limits + global caps so integration tests aren't
        // throttled; the limiter logic itself is covered by unit tests
        env: {
            SOCKET_RATE: "100000",
            SOCKET_BURST: "100000",
            REST_RATE: "100000",
            REST_BURST: "100000",
            MAX_OPEN_GAMES: "100000",
        },
        // the game-server pulls in CJS deps from its own node_modules
        server: {
            deps: {
                inline: ["halfblindchess", "halfblindchessground"],
            },
        },
    },
});
