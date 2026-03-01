import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { AuditService } from '../../common/audit/audit.service.js';

@Injectable()
export class EquipmentService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  list(organizationId: string) {
    return this.prisma.equipmentItem.findMany({ where: { organizationId, active: true } });
  }

  async reserve(
    organizationId: string,
    actorUserId: string,
    payload: { equipmentItemId: string; workOrderId: string; startAt: string; endAt: string },
  ) {
    const startAt = new Date(payload.startAt);
    const endAt = new Date(payload.endAt);

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
}

