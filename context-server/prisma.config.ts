import { defineConfig } from '@prisma/config'

export default defineConfig({
    earlyAccess: true,
    url: process.env.DATABASE_URL
})
