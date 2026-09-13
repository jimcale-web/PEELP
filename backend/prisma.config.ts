import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
        seed: "tsx prisma/seed.ts",
    },
    datasource: {
        // Client generation does not connect to the database, so it must also
        // work during Railway's build phase before runtime variables exist.
        url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/peelp_build?schema=public",
    },
});
