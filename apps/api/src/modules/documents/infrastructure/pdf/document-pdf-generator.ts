import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  constancia_matricula: 'Constancia de Matrícula',
  certificado_notas: 'Certificado de Notas',
  constancia_buena_conducta: 'Constancia de Buena Conducta',
  otro: 'Documento',
};

export interface DocumentPdfInput {
  id: string;
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
 *
 * El QR apunta a la página pública de verificación (`/documentos/verificar/
 * :id`, sin login) — el UUID del documento ya es aleatorio e imposible de
 * adivinar, mismo modelo de acceso que el tracking code de admisiones, así
 * que no hace falta firmarlo ni agregar un token aparte.
 */
@Injectable()
export class DocumentPdfGenerator {
  constructor(private readonly config: ConfigService) {}

  async generate(input: DocumentPdfInput): Promise<Buffer> {
    const webUrl = this.config.get<string>('WEB_PUBLIC_URL') ?? 'http://localhost:3000';
    const verificationUrl = `${webUrl}/documentos/verificar/${input.id}`;
    const qrBuffer = await QRCode.toBuffer(verificationUrl, { type: 'png', width: 100, margin: 1 });

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

      const qrSize = 80;
      const qrX = doc.page.margins.left;
      const qrY = doc.page.height - doc.page.margins.bottom - qrSize;
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
      doc
        .fontSize(8)
        .text('Escaneá para verificar la autenticidad de este documento', qrX + qrSize + 10, qrY + qrSize / 2 - 8, {
          width: 250,
        });

      doc.end();
    });
  }
}
