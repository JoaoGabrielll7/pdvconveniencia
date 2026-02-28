import { LicenseStatus, type License, type LicenseActivation, type LicenseHistory, type Prisma } from '@prisma/client';
import { prisma } from '../config/database';

type ListFilter = {
  status?: LicenseStatus;
  search?: string;
  user?: string;
  limit: number;
  offset: number;
};

type LicenseInclude = {
  include?: Prisma.LicenseInclude;
};

function buildWhere(filter: Omit<ListFilter, 'limit' | 'offset'>): Prisma.LicenseWhereInput {
  const and: Prisma.LicenseWhereInput[] = [];

  if (filter.status) and.push({ status: filter.status });
  if (filter.search) {
    and.push({
      OR: [
        { licenseKey: { contains: filter.search, mode: 'insensitive' } },
        { user: { nome: { contains: filter.search, mode: 'insensitive' } } },
        { user: { email: { contains: filter.search, mode: 'insensitive' } } },
      ],
    });
  }
  if (filter.user) {
    and.push({
      OR: [
        { userId: filter.user },
        { user: { nome: { contains: filter.user, mode: 'insensitive' } } },
        { user: { email: { contains: filter.user, mode: 'insensitive' } } },
      ],
    });
  }

  return and.length ? { AND: and } : {};
}

export const licenseRepository = {
  async findUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, nome: true, email: true, ativo: true, role: true },
    });
  },

  async findById(id: string, options?: LicenseInclude) {
    return prisma.license.findUnique({
      where: { id },
      include: options?.include,
    });
  },

  async findByKey(licenseKey: string, options?: LicenseInclude) {
    return prisma.license.findUnique({
      where: { licenseKey },
      include: options?.include,
    });
  },

  async findLatestByUser(userId: string): Promise<License | null> {
    return prisma.license.findFirst({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }],
    });
  },

  async licenseKeyExists(licenseKey: string): Promise<boolean> {
    const exists = await prisma.license.findUnique({
      where: { licenseKey },
      select: { id: true },
    });
    return Boolean(exists);
  },

  async create(data: Prisma.LicenseCreateInput): Promise<License> {
    return prisma.license.create({ data });
  },

  async update(id: string, data: Prisma.LicenseUpdateInput): Promise<License> {
    return prisma.license.update({ where: { id }, data });
  },

  async delete(id: string): Promise<License> {
    return prisma.license.delete({ where: { id } });
  },

  async list(filter: ListFilter) {
    const where = buildWhere(filter);
    const [items, total] = await Promise.all([
      prisma.license.findMany({
        where,
        skip: filter.offset,
        take: filter.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, nome: true, email: true, role: true } },
        },
      }),
      prisma.license.count({ where }),
    ]);
    return { items, total };
  },

  async findActivation(licenseId: string, deviceHash: string): Promise<LicenseActivation | null> {
    return prisma.licenseActivation.findUnique({
      where: {
        licenseId_deviceId: {
          licenseId,
          deviceId: deviceHash,
        },
      },
    });
  },

  async countActivations(licenseId: string): Promise<number> {
    return prisma.licenseActivation.count({ where: { licenseId } });
  },

  async createActivation(licenseId: string, deviceHash: string): Promise<LicenseActivation> {
    return prisma.licenseActivation.create({
      data: {
        licenseId,
        deviceId: deviceHash,
      },
    });
  },

  async updateActivationLastCheck(id: string): Promise<LicenseActivation> {
    return prisma.licenseActivation.update({
      where: { id },
      data: { lastCheck: new Date() },
    });
  },

  async listActivations(licenseId: string): Promise<LicenseActivation[]> {
    return prisma.licenseActivation.findMany({
      where: { licenseId },
      orderBy: { lastCheck: 'desc' },
    });
  },

  async createHistory(licenseId: string, action: string, performedBy: string): Promise<LicenseHistory> {
    return prisma.licenseHistory.create({
      data: {
        licenseId,
        action,
        performedBy,
      },
    });
  },

  async listHistory(licenseId: string): Promise<LicenseHistory[]> {
    return prisma.licenseHistory.findMany({
      where: { licenseId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async expireOutdated(now = new Date()): Promise<number> {
    const result = await prisma.license.updateMany({
      where: {
        status: LicenseStatus.ACTIVE,
        expiresAt: { not: null, lt: now },
      },
      data: { status: LicenseStatus.EXPIRED },
    });
    return result.count;
  },
};
