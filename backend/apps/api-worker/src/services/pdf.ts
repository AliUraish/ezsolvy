/**
 * PDF generation using pdf-lib
 * Runs entirely in Cloudflare Workers
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { Env } from '../types/env';

export async function composePDF(canvasState: any, env: Env): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612; // Letter size
  const pageHeight = 792;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - 50;

  // Add title
  const title = canvasState.title || 'EzSolvy Document';
  currentPage.drawText(title, {
    x: 50,
    y: yPosition,
    size: 24,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  yPosition -= 50;

  // Process canvas elements
  const elements = canvasState.elements || [];

  for (const element of elements) {
    // Check if we need a new page
    if (yPosition < 100) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - 50;
    }

    if (element.type === 'text') {
      const content = element.content || '';
      const isHeading = element.is_heading || false;
      const textFont = isHeading ? boldFont : font;
      const fontSize = isHeading ? 16 : 11;

      // Word wrap text
      const maxWidth = pageWidth - 100;
      const words = content.split(' ');
      let line = '';

      for (const word of words) {
        const testLine = line + word + ' ';
        const testWidth = textFont.widthOfTextAtSize(testLine, fontSize);

        if (testWidth > maxWidth && line !== '') {
          currentPage.drawText(line.trim(), {
            x: 50,
            y: yPosition,
            size: fontSize,
            font: textFont,
            color: rgb(0.1, 0.1, 0.1),
          });
          yPosition -= fontSize + 4;
          line = word + ' ';

          if (yPosition < 100) {
            currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
            yPosition = pageHeight - 50;
          }
        } else {
          line = testLine;
        }
      }

      if (line.trim()) {
        currentPage.drawText(line.trim(), {
          x: 50,
          y: yPosition,
          size: fontSize,
          font: textFont,
          color: rgb(0.1, 0.1, 0.1),
        });
        yPosition -= fontSize + 4;
      }

      yPosition -= 12; // Space after paragraph
    } else if (element.type === 'image' || element.type === 'diagram') {
      const imageUrl = element.url;
      if (imageUrl) {
        try {
          // Download image
          const imageResponse = await fetch(imageUrl);
          const imageBytes = await imageResponse.arrayBuffer();

          // Embed image (support PNG and JPEG)
          let embeddedImage;
          if (imageUrl.toLowerCase().endsWith('.png')) {
            embeddedImage = await pdfDoc.embedPng(imageBytes);
          } else {
            embeddedImage = await pdfDoc.embedJpg(imageBytes);
          }

          const imageDims = embeddedImage.scale(0.5);
          const imageWidth = Math.min(imageDims.width, pageWidth - 100);
          const imageHeight = (imageWidth / imageDims.width) * imageDims.height;

          // Check if image fits on current page
          if (yPosition - imageHeight < 100) {
            currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
            yPosition = pageHeight - 50;
          }

          currentPage.drawImage(embeddedImage, {
            x: 50,
            y: yPosition - imageHeight,
            width: imageWidth,
            height: imageHeight,
          });

          yPosition -= imageHeight + 20;

          // Add caption if present
          if (element.caption) {
            currentPage.drawText(element.caption, {
              x: 50,
              y: yPosition,
              size: 9,
              font: font,
              color: rgb(0.4, 0.4, 0.4),
            });
            yPosition -= 20;
          }
        } catch (error) {
          console.error('Failed to embed image:', error);
        }
      }
    } else if (element.type === 'page_break') {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - 50;
    }
  }

  // Add transcript if present
  if (canvasState.transcript) {
    currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    yPosition = pageHeight - 50;

    currentPage.drawText('Transcript', {
      x: 50,
      y: yPosition,
      size: 24,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    yPosition -= 40;

    const paragraphs = canvasState.transcript.split('\n\n');
    for (const para of paragraphs) {
      if (!para.trim()) continue;

      const words = para.split(' ');
      let line = '';
      const maxWidth = pageWidth - 100;

      for (const word of words) {
        const testLine = line + word + ' ';
        const testWidth = font.widthOfTextAtSize(testLine, 11);

        if (testWidth > maxWidth && line !== '') {
          if (yPosition < 100) {
            currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
            yPosition = pageHeight - 50;
          }

          currentPage.drawText(line.trim(), {
            x: 50,
            y: yPosition,
            size: 11,
            font: font,
            color: rgb(0.1, 0.1, 0.1),
          });
          yPosition -= 15;
          line = word + ' ';
        } else {
          line = testLine;
        }
      }

      if (line.trim()) {
        if (yPosition < 100) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          yPosition = pageHeight - 50;
        }

        currentPage.drawText(line.trim(), {
          x: 50,
          y: yPosition,
          size: 11,
          font: font,
          color: rgb(0.1, 0.1, 0.1),
        });
        yPosition -= 15;
      }

      yPosition -= 10; // Space between paragraphs
    }
  }

  // Save PDF
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

