import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export interface ReportCardScoreRow {
  subjectName: string;
  period: string;
  type: string;
  score: number;
  maxScore: number;
}

export interface ReportCardStudent {
  studentName: string;
  rows: ReportCardScoreRow[];
}

export interface ReportCardInput {
  institutionName: string;
  sectionName: string;
  academicYearName: string;
  students: ReportCardStudent[];
}

/**
 * Un boletín por estudiante, todos en el mismo PDF (una página por
 * estudiante vía `addPage()`) — así "todo el curso" y "un solo estudiante"
 * usan el mismo generador sin necesitar armar un .zip.
 */
@Injectable()
export class ReportCardPdfGenerator {
  generate(input: ReportCardInput): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 56 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      input.students.forEach((student, index) => {
        if (index > 0) doc.addPage();
        this.renderStudentPage(doc, input, student);
      });

      doc.end();
    });
  }

  private renderStudentPage(doc: PDFKit.PDFDocument, input: ReportCardInput, student: ReportCardStudent) {
    doc.fontSize(10).text(input.institutionName, { align: 'right' });
    doc.moveDown(1.5);
    doc.fontSize(16).text('Boletín de Notas', { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(12).text(`Estudiante: ${student.studentName}`);
    doc.text(`Sección: ${input.sectionName} — Año lectivo: ${input.academicYearName}`);
    doc.moveDown(1);

    if (student.rows.length === 0) {
      doc.fontSize(11).text('Sin notas registradas todavía.');
      return;
    }

    doc.fontSize(10);
    const startX = doc.x;
    doc.text('Asignatura', startX, doc.y, { continued: true, width: 180 });
    doc.text('Período', { continued: true, width: 90 });
    doc.text('Tipo', { continued: true, width: 90 });
    doc.text('Nota');
    doc.moveDown(0.3);
    doc.moveTo(startX, doc.y).lineTo(540, doc.y).stroke();
    doc.moveDown(0.3);

    for (const row of student.rows) {
      doc.text(row.subjectName, startX, doc.y, { continued: true, width: 180 });
      doc.text(row.period, { continued: true, width: 90 });
      doc.text(row.type, { continued: true, width: 90 });
      doc.text(`${row.score}/${row.maxScore}`);
    }
  }
}
