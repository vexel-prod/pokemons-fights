import { PrismaLibSql } from '@prisma/adapter-libsql'
import { PrismaClient } from '../generated/prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

const env = globalThis.process?.env
const url = env?.DATABASE_URL
if (!url) {
  throw new Error('DATABASE_URL is not set')
}

const adapter = new PrismaLibSql({ url })

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: env?.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (env?.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
