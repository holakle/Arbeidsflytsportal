import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

@Injectable()
export class EquipmentService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  list(organizationId: string, query?: { type?: 'EQUIPMENT' | 'CONSUMABLE' }) {
    return this.prisma.equipmentItem.findMany({
      where: { organizationId, active: true, ...(query?.type ? { type: query.type } : {}) },
    });
  }

  async listReservations(
    organizationId: string,
    query: { page: number; limit: number; equipmentItemId?: string; from?: string; to?: string },
  ) {
    const where = {
      equipmentItem: { is: { organizationId } },
      ...(query.equipmentItemId ? { equipmentItemId: query.equipmentItemId } : {}),
      ...(query.from || query.to
        ? {
            startAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.equipmentReservation.findMany({
        where,
        orderBy: { startAt: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          equipmentItem: { select: { id: true, name: true, serialNumber: true, barcode: true } },
          workOrder: { select: { id: true, title: true, status: true } },
        },
      }),
      this.prisma.equipmentReservation.count({ where }),
    ]);

    return { items, page: query.page, limit: query.limit, total };
  }

  async lookupByCode(organizationId: string, actorUserId: string, rawCode: string) {
    const code = this.normalizeBarcode(rawCode);
    const item = await this.prisma.equipmentItem.findFirst({
      where: { organizationId, barcode: code, active: true },
    });

    if (!item) {
      await this.audit.log({
        organizationId,
        actorUserId,
        action: 'equipment.lookup',
        entityType: 'EquipmentItem',
        entityId: `barcode:${code}`,
        after: { code, found: false },
      });
      return {
        code,
        found: false,
        item: null,
        status: 'NOT_FOUND' as const,
        activeReservation: null,
      };
    }

    if (item.type === 'CONSUMABLE') {
      await this.audit.log({
        organizationId,
        actorUserId,
        action: 'equipment.lookup',
        entityType: 'EquipmentItem',
        entityId: item.id,
        after: { code, found: true, status: 'CONSUMABLE' },
      });
      return {
        code,
        found: true,
        item,
        status: 'CONSUMABLE' as const,
        activeReservation: null,
      };
    }

    const now = new Date();
    const activeReservation = await this.prisma.equipmentReservation.findFirst({
      where: {
        equipmentItemId: item.id,
        equipmentItem: { is: { organizationId } },
        startAt: { lte: now },
        endAt: { gte: now },
      },
      orderBy: { startAt: 'desc' },
      include: {
        equipmentItem: { select: { id: true, name: true, serialNumber: true, barcode: true } },
        workOrder: { select: { id: true, title: true, status: true } },
      },
    });

    const status = activeReservation ? 'RESERVED_ACTIVE' : 'AVAILABLE';

    await this.audit.log({
      organizationId,
      actorUserId,
      action: 'equipment.lookup',
      entityType: 'EquipmentItem',
      entityId: item.id,
      after: { code, found: true, status },
    });

    return {
      code,
      found: true,
      item,
      status,
      activeReservation: activeReservation ?? null,
    };
  }

  async attachBarcode(
    organizationId: string,
    actorUserId: string,
    itemId: string,
    rawBarcode: string,
  ) {
    const barcode = this.normalizeBarcode(rawBarcode);

    const item = await this.prisma.equipmentItem.findFirst({
      where: { id: itemId, organizationId },
    });
    if (!item) {
      throw new NotFoundException('Equipment item not found');
    }

    const conflict = await this.prisma.equipmentItem.findFirst({
      where: { organizationId, barcode, id: { not: itemId } },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException('Barcode already attached to another item');
    }

    const updated = await this.prisma.equipmentItem.update({
      where: { id: itemId },
      data: { barcode },
    });

    await this.audit.log({
      organizationId,
      actorUserId,
      action: 'equipment.barcode_attached',
      entityType: 'EquipmentItem',
      entityId: updated.id,
      before: { barcode: item.barcode },
      after: { barcode: updated.barcode },
    });

    return { item: updated };
  }

  async reserve(
    organizationId: string,
    actorUserId: string,
    payload: { equipmentItemId: string; workOrderId: string; startAt: string; endAt: string },
  ) {
    const startAt = new Date(payload.startAt);
    const endAt = new Date(payload.endAt);

    const item = await this.prisma.equipmentItem.findFirst({
      where: { id: payload.equipmentItemId, organizationId, active: true },
      select: { id: true, type: true },
    });
    if (!item) {
      throw new NotFoundException('Equipment item not found');
    }
    if (item.type !== 'EQUIPMENT') {
      throw new BadRequestException('Consumables cannot be reserved');
    }

    const conflict = await this.prisma.equipmentReservation.findFirst({
      where: {
        equipmentItemId: payload.equipmentItemId,
        OR: [{ startAt: { lt: endAt }, endAt: { gt: startAt } }],
      },
    });

    if (conflict) {
      throw new ConflictException('Equipment already reserved in this period');
    }

    const reservation = await this.prisma.equipmentReservation.create({
      data: {
        equipmentItemId: payload.equipmentItemId,
        workOrderId: payload.workOrderId,
        startAt,
        endAt,
      },
    });

    await this.audit.log({
      organizationId,
      actorUserId,
      action: 'equipment.reserved',
      entityType: 'EquipmentReservation',
      entityId: reservation.id,
      after: payload,
    });

    return reservation;
  }

  async removeReservation(organizationId: string, actorUserId: string, reservationId: string) {
    const reservation = await this.prisma.equipmentReservation.findFirst({
      where: {
        id: reservationId,
        equipmentItem: { is: { organizationId } },
      },
      select: {
        id: true,
        equipmentItemId: true,
        workOrderId: true,
        startAt: true,
        endAt: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Equipment reservation not found');
    }

    await this.prisma.equipmentReservation.delete({ where: { id: reservationId } });

    await this.audit.log({
      organizationId,
      actorUserId,
      action: 'equipment.reservation_deleted',
      entityType: 'EquipmentReservation',
      entityId: reservationId,
      before: reservation,
    });

    return { success: true as const };
  }

  private normalizeBarcode(value: string) {
    const normalized = value.trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException('Barcode cannot be empty');
    }
    return normalized;
  }
}
