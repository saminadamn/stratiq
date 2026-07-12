import type PDFDocumentClass from 'pdfkit';
import type { PdfCardSpec } from '../../application/ports/report-generator.port.js';

type PDFDocument = InstanceType<typeof PDFDocumentClass>;

const HEADING_COLOR = '#0f172a'; // slate-900
const BODY_COLOR = '#334155'; // slate-700
const MUTED_COLOR = '#94a3b8'; // slate-400
const BORDER_COLOR = '#e2e8f0'; // slate-200
const FIELD_LABEL_COLOR = '#94a3b8'; // slate-400
const CARD_PADDING = 12;
const CARD_GAP = 10;
const TITLE_FONT_SIZE = 11;
const BODY_FONT_SIZE = 9.5;
const FIELD_FONT_SIZE = 8.5;

// Executive-readable prose, wrapped with generous line height — the
// alternative to a data table for an Executive Summary section (see
// report-builder.service.ts).
export function drawParagraphs(
  doc: PDFDocument,
  paragraphs: string[],
  x: number,
  y: number,
  width: number,
): number {
  let cursorY = y;
  doc.font('Helvetica').fontSize(10).fillColor(BODY_COLOR);
  for (const paragraph of paragraphs) {
    const height = doc.heightOfString(paragraph, { width });
    if (cursorY + height > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      cursorY = doc.page.margins.top;
    }
    doc.text(paragraph, x, cursorY, { width, lineGap: 2 });
    cursorY += height + 10;
  }
  return cursorY;
}

// Measures the field row's actual height instead of assuming a fixed
// two-line block — a value like "Customer Success" can wrap inside a narrow
// quarter-width column, and an unaccounted wrap here is exactly what causes
// the card's drawn content to exceed its precomputed (and therefore its
// page-break check's) height, corrupting pagination downstream.
function fieldsRowHeight(
  doc: PDFDocument,
  fields: Array<{ label: string; value: string }>,
  innerWidth: number,
): number {
  const fieldWidth = innerWidth / fields.length - 6;
  let maxHeight = 0;
  for (const field of fields) {
    doc.font('Helvetica-Bold').fontSize(FIELD_FONT_SIZE - 1);
    const labelHeight = doc.heightOfString(field.label.toUpperCase(), { width: fieldWidth });
    doc.font('Helvetica-Bold').fontSize(FIELD_FONT_SIZE + 1);
    const valueHeight = doc.heightOfString(field.value, { width: fieldWidth });
    maxHeight = Math.max(maxHeight, labelHeight + 2 + valueHeight);
  }
  return maxHeight;
}

function cardHeight(doc: PDFDocument, card: PdfCardSpec, width: number): number {
  const innerWidth = width - CARD_PADDING * 2;
  // Must match the draw loop's titleWidth exactly, or the estimate and the
  // actual render disagree on how many lines the title wraps to.
  const titleWidth = card.badge ? innerWidth - 80 : innerWidth;
  let height = CARD_PADDING * 2;
  doc.font('Helvetica-Bold').fontSize(TITLE_FONT_SIZE);
  height += doc.heightOfString(card.title, { width: titleWidth });
  if (card.body) {
    doc.font('Helvetica').fontSize(BODY_FONT_SIZE);
    height += 6 + doc.heightOfString(card.body, { width: innerWidth });
  }
  if (card.fields && card.fields.length > 0) {
    height += 8 + fieldsRowHeight(doc, card.fields, innerWidth) + 6;
  }
  return height;
}

// Draws each finding/recommendation as a bordered card (title + badge, body
// paragraph, small label/value field row) instead of a table row — the PDF
// equivalent of DecisionIntelligencePanel's web cards, so the two surfaces
// read the same way. Page-break-aware like drawTable: computes each card's
// height up front and starts a new page rather than splitting a card across
// two pages.
export function drawCards(
  doc: PDFDocument,
  cards: PdfCardSpec[],
  x: number,
  y: number,
  width: number,
): number {
  let cursorY = y;
  const bottomLimit = doc.page.height - doc.page.margins.bottom;

  for (const card of cards) {
    const height = cardHeight(doc, card, width);
    if (cursorY + height > bottomLimit) {
      doc.addPage();
      cursorY = doc.page.margins.top;
    }

    doc.strokeColor(BORDER_COLOR).lineWidth(0.75).rect(x, cursorY, width, height).stroke();
    const innerX = x + CARD_PADDING;
    const innerWidth = width - CARD_PADDING * 2;
    let rowY = cursorY + CARD_PADDING;

    const titleWidth = card.badge ? innerWidth - 80 : innerWidth;
    doc.font('Helvetica-Bold').fontSize(TITLE_FONT_SIZE).fillColor(HEADING_COLOR);
    doc.text(card.title, innerX, rowY, { width: titleWidth });
    const titleHeight = doc.heightOfString(card.title, { width: titleWidth });

    if (card.badge) {
      const badgeWidth = 70;
      const badgeX = innerX + innerWidth - badgeWidth;
      doc.roundedRect(badgeX, rowY - 2, badgeWidth, 14, 7).fill(card.badge.color);
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#ffffff')
        .text(card.badge.label.toUpperCase(), badgeX, rowY + 1.5, {
          width: badgeWidth,
          align: 'center',
        });
    }
    rowY += titleHeight + 6;

    if (card.body) {
      doc.font('Helvetica').fontSize(BODY_FONT_SIZE).fillColor(BODY_COLOR);
      doc.text(card.body, innerX, rowY, { width: innerWidth, lineGap: 1 });
      rowY += doc.heightOfString(card.body, { width: innerWidth }) + 8;
    }

    if (card.fields && card.fields.length > 0) {
      const fieldWidth = innerWidth / card.fields.length;
      const fieldTextWidth = fieldWidth - 6;
      doc
        .strokeColor(BORDER_COLOR)
        .lineWidth(0.5)
        .moveTo(innerX, rowY)
        .lineTo(innerX + innerWidth, rowY)
        .stroke();
      rowY += 6;
      card.fields.forEach((field, i) => {
        const fieldX = innerX + fieldWidth * i;
        const label = field.label.toUpperCase();
        doc.font('Helvetica-Bold').fontSize(FIELD_FONT_SIZE - 1);
        const labelHeight = doc.heightOfString(label, { width: fieldTextWidth });
        doc
          .fillColor(FIELD_LABEL_COLOR)
          .text(label, fieldX, rowY, { width: fieldTextWidth, characterSpacing: 0.3 });
        doc
          .font('Helvetica-Bold')
          .fontSize(FIELD_FONT_SIZE + 1)
          .fillColor(HEADING_COLOR)
          .text(field.value, fieldX, rowY + labelHeight + 2, { width: fieldTextWidth });
      });
    }

    cursorY += height + CARD_GAP;
  }

  doc.fillColor(BODY_COLOR).font('Helvetica');
  return cursorY;
}

export function emptyStateText(doc: PDFDocument, text: string, x: number, y: number): number {
  doc.fontSize(10).fillColor(MUTED_COLOR).font('Helvetica-Oblique').text(text, x, y);
  const height = doc.heightOfString(text, { width: doc.page.width });
  doc.fillColor(BODY_COLOR).font('Helvetica');
  return y + height;
}
