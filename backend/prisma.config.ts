import "dotenv/config";
import { defineConfig } from "prisma/config";

type RuntimeProcess = {
    argv: string[];
    env?: Record<string, string | undefined>;
};

const runtimeProcess = (globalThis as typeof globalThis & { process?: RuntimeProcess }).process;
const isClientGeneration = runtimeProcess?.argv.includes("generate") ?? false;
const fallbackDatabaseUrl = "postgresql://postgres:postgres@localhost:5432/peelp_build?schema=public";
const databaseUrl = runtimeProcess?.env?.DATABASE_URL ?? (isClientGeneration ? fallbackDatabaseUrl : undefined);

if (!databaseUrl) {
    throw new Error("DATABASE_URL must be configured before running Prisma migrations or schema commands.");
}

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
        seed: "tsx prisma/seed.ts",
    },
    datasource: {
        // Client generation can happen during the build phase before the runtime
        // DATABASE_URL is available, so we provide a safe local fallback for that step.
        url: databaseUrl,
    },
});
