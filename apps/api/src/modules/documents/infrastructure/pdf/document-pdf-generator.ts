import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  constancia_matricula: 'Constancia de Matrícula',
  certificado_notas: 'Certificado de Notas',
  constancia_buena_conducta: 'Constancia de Buena Conducta',
  otro: 'Documento',
};

export interface DocumentPdfInput {
  type: string;
  description: string;
  issuedAt: string;
  studentName: string;
  institutionName: string;
}

/**
 * Plantilla simple de texto con pdfkit (sin Chrome headless, buen fit para
 * contenedores chicos) — sin logo posicionado con precisión ni firma
 * digital, fuera de alcance (ya documentado como pendiente en el README).
 */
@Injectable()
export class DocumentPdfGenerator {
  generate(input: DocumentPdfInput): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 72 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(10).text(input.institutionName, { align: 'right' });
      doc.moveDown(2);

      doc.fontSize(18).text(DOCUMENT_TYPE_LABELS[input.type] ?? input.type, { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(12).text(`Estudiante: ${input.studentName}`);
      doc.moveDown(0.5);
      doc.text(`Fecha de emisión: ${input.issuedAt}`);
      doc.moveDown(1.5);

      doc.fontSize(11).text(input.description, { align: 'justify' });
      doc.moveDown(3);

      doc.fontSize(10).text('Este documento fue generado automáticamente por Skolaria.', {
        align: 'center',
      });

      doc.end();
    });
  }
}
