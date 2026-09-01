import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ScheduleRepositoryPort } from '../ports/schedule.repository.port';
import { buildVirtualRoomName } from '../services/virtual-room-name';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

export interface VirtualRoomResult {
  roomName: string;
  roomUrl: string;
}

@Injectable()
export class GetVirtualRoomUseCase {
  constructor(@Inject(ScheduleRepositoryPort) private readonly schedules: ScheduleRepositoryPort) {}

  async execute(scheduleId: string, currentUser: JwtPayload): Promise<VirtualRoomResult> {
    const schedule = await this.schedules.findById(scheduleId);
    if (!schedule) {
      throw new NotFoundException(`No existe el horario "${scheduleId}"`);
    }
    if (!schedule.isVirtual) {
      throw new BadRequestException('Esta clase no tiene videollamada habilitada');
    }

    const roomName = buildVirtualRoomName(currentUser.tenantId, schedule.id);
    return { roomName, roomUrl: `https://meet.jit.si/${roomName}` };
  }
}
