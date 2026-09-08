import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export interface ReportCardPeriodColumn {
  periodId: string;
  periodName: string;
}

export interface ReportCardSubjectRow {
  subjectName: string;
  gradeByPeriodId: Record<string, number | null>;
  recoveredPeriodIds: Set<string>;
  finalGrade: number | null;
}

export interface ReportCardAreaGroup {
  areaName: string;
  subjects: ReportCardSubjectRow[];
  averageByPeriodId: Record<string, number | null>;
  finalAverage: number | null;
}

export interface ReportCardStudent {
  studentName: string;
  periods: ReportCardPeriodColumn[];
  areas: ReportCardAreaGroup[];
}

export interface ReportCardInput {
  institutionName: string;
  institutionColor: string | null;
  institutionLogoPath: string | null;
  sectionName: string;
  academicYearName: string;
  students: ReportCardStudent[];
}

const DEFAULT_ACCENT = '#9184d9';
const MARGIN = 40;
const PAGE_WIDTH = 595.28; // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const SUBJECT_COL_WIDTH = 180;

const INK = '#1f2230';
const MUTED = '#6c7189';
const LINE = '#e6e8f2';
const ROW_ALT = '#f7f8fc';

/**
 * Un boletín por estudiante, todos en el mismo PDF (una página por
 * estudiante vía `addPage()`). Por estudiante: una tabla por área, con los
 * periodos del año lectivo como columnas + "Definitiva" — no se lista el
 * detalle de evaluaciones sueltas, eso queda solo en el gradebook.
 */
@Injectable()
export class ReportCardPdfGenerator {
  private readonly logger = new Logger(ReportCardPdfGenerator.name);

  generate(input: ReportCardInput): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: MARGIN });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const accent = input.institutionColor || DEFAULT_ACCENT;

      input.students.forEach((student, index) => {
        if (index > 0) doc.addPage();
        this.renderStudentPage(doc, input, student, accent);
      });

      doc.end();
    });
  }

  private renderStudentPage(
    doc: PDFKit.PDFDocument,
    input: ReportCardInput,
    student: ReportCardStudent,
    accent: string,
  ) {
    let y = this.renderHeader(doc, input, accent);
    y = this.renderStudentCard(doc, input, student, y);

    if (student.areas.length === 0) {
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor(MUTED)
        .text('Sin notas registradas todavía.', MARGIN, y + 24, { width: CONTENT_WIDTH, align: 'center' });
      this.renderFooter(doc);
      return;
    }

    let hasRecovered = false;
    for (const area of student.areas) {
      const rowCount = area.subjects.length + 1; // + fila de promedio de área
      y = this.ensureSpace(doc, y, 26 + 20 + rowCount * 22 + 14);
      y = this.renderAreaTable(doc, area, student.periods, y, accent);
      y += 14;
      if (area.subjects.some((s) => s.recoveredPeriodIds.size > 0)) hasRecovered = true;
    }

    if (hasRecovered) {
      y = this.ensureSpace(doc, y, 14);
      doc.font('Helvetica').fontSize(8).fillColor(MUTED).text('(* = recuperada)', MARGIN, y, { width: CONTENT_WIDTH });
    }

    this.renderFooter(doc);
  }

  private renderHeader(doc: PDFKit.PDFDocument, input: ReportCardInput, accent: string): number {
    const bandHeight = 64;
    doc.rect(MARGIN, MARGIN, CONTENT_WIDTH, bandHeight).fill(accent);

    let textX = MARGIN + 16;
    if (input.institutionLogoPath) {
      try {
        doc.image(input.institutionLogoPath, MARGIN + 12, MARGIN + 12, { fit: [40, 40] });
        textX = MARGIN + 64;
      } catch (err) {
        this.logger.warn(`No se pudo incrustar el logo institucional: ${(err as Error).message}`);
      }
    }

    doc
      .font('Helvetica-Bold')
      .fontSize(15)
      .fillColor('#ffffff')
      .text(input.institutionName, textX, MARGIN + 22, { width: 300 });

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor('#ffffff')
      .text('BOLETÍN DE NOTAS', MARGIN, MARGIN + 26, { width: CONTENT_WIDTH, align: 'right' });

    return MARGIN + bandHeight + 16;
  }

  private renderStudentCard(
    doc: PDFKit.PDFDocument,
    input: ReportCardInput,
    student: ReportCardStudent,
    y: number,
  ): number {
    const cardHeight = 54;
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, cardHeight, 8).fill(ROW_ALT);

    const colWidth = CONTENT_WIDTH / 3;
    const columns: [string, string][] = [
      ['ESTUDIANTE', student.studentName],
      ['SECCIÓN', input.sectionName],
      ['AÑO LECTIVO', input.academicYearName],
    ];

    columns.forEach(([label, value], i) => {
      const x = MARGIN + 16 + i * colWidth;
      doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(label, x, y + 12, { width: colWidth - 20 });
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor(INK)
        .text(value, x, y + 26, { width: colWidth - 20, ellipsis: true });
    });

    return y + cardHeight + 20;
  }

  private renderAreaTable(
    doc: PDFKit.PDFDocument,
    area: ReportCardAreaGroup,
    periods: ReportCardPeriodColumn[],
    y: number,
    accent: string,
  ): number {
    doc.rect(MARGIN, y, 4, 18).fill(accent);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(INK).text(area.areaName, MARGIN + 12, y + 2, {
      width: CONTENT_WIDTH - 12,
    });
    y += 26;

    const dataColsWidth = CONTENT_WIDTH - SUBJECT_COL_WIDTH;
    const colCount = periods.length + 1; // + Definitiva
    const colWidth = dataColsWidth / colCount;

    doc.rect(MARGIN, y, CONTENT_WIDTH, 20).fill(LINE);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED);
    doc.text('MATERIA', MARGIN + 8, y + 6, { width: SUBJECT_COL_WIDTH - 8 });
    periods.forEach((period, i) => {
      doc.text(period.periodName.toUpperCase(), MARGIN + SUBJECT_COL_WIDTH + i * colWidth, y + 6, {
        width: colWidth,
        align: 'center',
      });
    });
    doc.text('DEFINITIVA', MARGIN + SUBJECT_COL_WIDTH + periods.length * colWidth, y + 6, {
      width: colWidth,
      align: 'center',
    });
    let rowY = y + 20;

    area.subjects.forEach((subject, i) => {
      if (i % 2 === 1) doc.rect(MARGIN, rowY, CONTENT_WIDTH, 22).fill(ROW_ALT);

      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(INK)
        .text(subject.subjectName, MARGIN + 8, rowY + 6, { width: SUBJECT_COL_WIDTH - 8, ellipsis: true });

      periods.forEach((period, j) => {
        const grade = subject.gradeByPeriodId[period.periodId] ?? null;
        const recovered = subject.recoveredPeriodIds.has(period.periodId);
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor(INK)
          .text(this.formatGrade(grade, recovered), MARGIN + SUBJECT_COL_WIDTH + j * colWidth, rowY + 6, {
            width: colWidth,
            align: 'center',
          });
      });

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(INK)
        .text(
          this.formatGrade(subject.finalGrade, false),
          MARGIN + SUBJECT_COL_WIDTH + periods.length * colWidth,
          rowY + 6,
          { width: colWidth, align: 'center' },
        );

      rowY += 22;
    });

    doc.rect(MARGIN, rowY, CONTENT_WIDTH, 22).fill(LINE);
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(INK)
      .text('Promedio área', MARGIN + 8, rowY + 6, { width: SUBJECT_COL_WIDTH - 8 });
    periods.forEach((period, j) => {
      const avg = area.averageByPeriodId[period.periodId] ?? null;
      doc.text(this.formatGrade(avg, false), MARGIN + SUBJECT_COL_WIDTH + j * colWidth, rowY + 6, {
        width: colWidth,
        align: 'center',
      });
    });
    doc.text(
      this.formatGrade(area.finalAverage, false),
      MARGIN + SUBJECT_COL_WIDTH + periods.length * colWidth,
      rowY + 6,
      { width: colWidth, align: 'center' },
    );
    rowY += 22;

    doc.rect(MARGIN, y, CONTENT_WIDTH, rowY - y).stroke(LINE);
    return rowY;
  }

  private formatGrade(grade: number | null, recovered: boolean): string {
    if (grade === null) return '-';
    return recovered ? `${grade.toFixed(1)}*` : grade.toFixed(1);
  }

  private renderFooter(doc: PDFKit.PDFDocument) {
    const today = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(MUTED)
      .text(`Generado automáticamente por Skolaria el ${today}.`, MARGIN, doc.page.height - MARGIN - 12, {
        width: CONTENT_WIDTH,
        align: 'center',
      });
  }

  /** Si el próximo bloque (encabezado de área + tabla) no entra en lo que queda de página, arranca una nueva. */
  private ensureSpace(doc: PDFKit.PDFDocument, y: number, blockHeight: number): number {
    const bottomLimit = doc.page.height - MARGIN - 24;
    if (y + blockHeight <= bottomLimit) return y;
    doc.addPage();
    return MARGIN;
  }
}
