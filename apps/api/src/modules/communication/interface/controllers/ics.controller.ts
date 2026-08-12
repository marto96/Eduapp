import { Controller, Get, Inject, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../../../../core/auth/public.decorator';
import { getCurrentTenant } from '../../../../core/tenant/tenant-context';
import { EventRepositoryPort } from '../../application/ports/event.repository.port';
import { Event } from '../../domain/entities/event.entity';

/**
 * Feed .ics de solo lectura, sin JWT — pensado para suscribirse desde una
 * app de calendario externa (Google Calendar, Apple Calendar, etc.), que
 * solo puede hacer polling periódico a una URL, no autenticarse. Por eso
 * únicamente incluye eventos institucionales (`sectionId === null`): no hay
 * forma de filtrar por audiencia sin un usuario autenticado, así que no se
 * reusa `ListEventsUseCase` (necesita un `JwtPayload` real para
 * `AudienceAccessService`) — se lee `EventRepositoryPort` directo y se
 * filtra acá mismo.
 */
@Controller('calendar')
@Public()
export class IcsController {
  constructor(@Inject(EventRepositoryPort) private readonly events: EventRepositoryPort) {}

  @Get('feed.ics')
  async getFeed(@Res() res: Response) {
    const { subdomain } = getCurrentTenant();
    const events = await this.events.findAll();
    const institutionalEvents = events.filter((e) => e.sectionId === null && !e.voidedAt);

    const ics = buildIcsFeed(subdomain, institutionalEvents);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="calendario.ics"');
    res.send(ics);
  }
}

function buildIcsFeed(calendarName: string, events: Event[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EduApp//Calendario//ES',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
  ];

  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.id}@eduapp`,
      `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
      `DTSTART:${toIcsDate(event.startsAt)}`,
      ...(event.endsAt ? [`DTEND:${toIcsDate(event.endsAt)}`] : []),
      `SUMMARY:${escapeIcsText(event.title)}`,
      `DESCRIPTION:${escapeIcsText(event.description)}`,
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function toIcsDate(isoDate: string): string {
  return new Date(isoDate).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}
