import PDFDocument from 'pdfkit';
import { Readable } from 'stream';
import { IContractForm } from '../models/contractFormModel';

export class PDFService {
  /**
   * Generate a PDF document for a single contract form
   */
  generateContractPDF(form: IContractForm): PDFDocument {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: form.contractName,
        Author: 'Contract Management Service',
        Subject: `${form.contractType} Contract`,
        CreationDate: new Date()
      }
    });

    // Header
    doc
      .fontSize(24)
      .fillColor('#2C3E50')
      .text(form.contractName, { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(12)
      .fillColor('#7F8C8D')
      .text(`Contract Type: ${form.contractType.toUpperCase()}`, { align: 'center' })
      .text(`Status: ${form.status.toUpperCase()}`, { align: 'center' })
      .moveDown(1);

    // Horizontal line
    doc
      .strokeColor('#BDC3C7')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke()
      .moveDown(1);

    // Contract Description
    if (form.contractDescription) {
      doc
        .fontSize(14)
        .fillColor('#2C3E50')
        .text('Description:', { underline: true })
        .moveDown(0.5);

      doc
        .fontSize(11)
        .fillColor('#34495E')
        .text(form.contractDescription, { align: 'justify' })
        .moveDown(1);
    }

    // Contract Content
    if (form.contractContent) {
      doc
        .fontSize(14)
        .fillColor('#2C3E50')
        .text('Contract Terms:', { underline: true })
        .moveDown(0.5);

      doc
        .fontSize(10)
        .fillColor('#34495E')
        .text(form.contractContent, { align: 'justify' })
        .moveDown(1.5);
    }

    // Party Information - Contract From
    if (form.contract_from) {
      doc
        .fontSize(14)
        .fillColor('#2C3E50')
        .text('Party Information:', { underline: true })
        .moveDown(0.5);

      const partyFrom = form.contract_from;

      doc.fontSize(11).fillColor('#34495E');
      doc.text(`Party Type: ${partyFrom.partyType}`, { continued: false });
      doc.text(`Full Name: ${partyFrom.fullName}`, { continued: false });
      doc.text(`Email: ${partyFrom.email}`, { continued: false });
      
      if (partyFrom.phone) {
        doc.text(`Phone: ${partyFrom.phone}`, { continued: false });
      }
      
      if (partyFrom.address) {
        doc.text(`Address: ${partyFrom.address}`, { continued: false });
      }
      
      doc.text(`Country: ${partyFrom.country}`, { continued: false });
      doc.text(`Designation: ${partyFrom.designation}`, { continued: false });

      // Business information if applicable
      if (partyFrom.partyType === 'business') {
        doc.moveDown(0.5);
        doc.fontSize(12).fillColor('#2C3E50').text('Business Details:', { underline: true });
        doc.fontSize(11).fillColor('#34495E');
        
        if (partyFrom.businessName) {
          doc.text(`Business Name: ${partyFrom.businessName}`, { continued: false });
        }
        if (partyFrom.businessAddress) {
          doc.text(`Business Address: ${partyFrom.businessAddress}`, { continued: false });
        }
        if (partyFrom.businessEmail) {
          doc.text(`Business Email: ${partyFrom.businessEmail}`, { continued: false });
        }
        if (partyFrom.businessPhone) {
          doc.text(`Business Phone: ${partyFrom.businessPhone}`, { continued: false });
        }
      }

      doc.moveDown(1);
    }

    // Party Information - Contract To
    if (form.contract_to) {
      doc
        .fontSize(14)
        .fillColor('#2C3E50')
        .text('Recipient Information:', { underline: true })
        .moveDown(0.5);

      const partyTo = form.contract_to;

      doc.fontSize(11).fillColor('#34495E');
      
      if (partyTo.fullName) {
        doc.text(`Full Name: ${partyTo.fullName}`, { continued: false });
      }
      doc.text(`Email: ${partyTo.email}`, { continued: false });
      
      if (partyTo.phone) {
        doc.text(`Phone: ${partyTo.phone}`, { continued: false });
      }
      
      if (partyTo.address) {
        doc.text(`Address: ${partyTo.address}`, { continued: false });
      }

      doc.moveDown(1);
    }

    // Signature Information
    if (form.contract_from?.signature) {
      doc
        .fontSize(14)
        .fillColor('#2C3E50')
        .text('Signature:', { underline: true })
        .moveDown(0.5);

      doc
        .fontSize(10)
        .fillColor('#7F8C8D')
        .text('Digital signature captured', { italics: true })
        .moveDown(0.5);
    }

    // Facial Capture Information
    if (form.contract_from?.facialCapture) {
      doc
        .fontSize(10)
        .fillColor('#7F8C8D')
        .text('Facial verification completed', { italics: true })
        .moveDown(1);
    }

    // Timestamps
    doc
      .fontSize(14)
      .fillColor('#2C3E50')
      .text('Document Information:', { underline: true })
      .moveDown(0.5);

    doc.fontSize(10).fillColor('#34495E');
    doc.text(`Contract Order ID: ${form.contractOrderId}`, { continued: false });
    doc.text(`Form ID: ${form._id}`, { continued: false });
    doc.text(`Created: ${new Date(form.createdAt).toLocaleString()}`, { continued: false });
    doc.text(`Last Updated: ${new Date(form.updatedAt).toLocaleString()}`, { continued: false });
    doc.text(`Submitted By: ${form.createdBy}`, { continued: false });

    // Footer
    doc.moveDown(2);
    doc
      .fontSize(8)
      .fillColor('#95A5A6')
      .text(
        'This is a digitally generated contract document from the Contract Management Service.',
        50,
        doc.page.height - 50,
        { align: 'center' }
      );

    return doc;
  }

  /**
   * Generate a combined PDF with multiple contracts
   */
  generateMultipleContractsPDF(forms: IContractForm[], userId: string): PDFDocument {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Contracts for User ${userId}`,
        Author: 'Contract Management Service',
        Subject: 'Signed Contracts Collection',
        CreationDate: new Date()
      }
    });

    // Cover page
    doc
      .fontSize(28)
      .fillColor('#2C3E50')
      .text('Contract Collection', { align: 'center' })
      .moveDown(1);

    doc
      .fontSize(14)
      .fillColor('#7F8C8D')
      .text(`User ID: ${userId}`, { align: 'center' })
      .text(`Total Contracts: ${forms.length}`, { align: 'center' })
      .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' })
      .moveDown(2);

    // Table of contents
    doc
      .fontSize(16)
      .fillColor('#2C3E50')
      .text('Table of Contents', { underline: true })
      .moveDown(1);

    forms.forEach((form, index) => {
      doc
        .fontSize(11)
        .fillColor('#34495E')
        .text(`${index + 1}. ${form.contractName} (${form.contractType})`, {
          continued: false
        });
    });

    // Add each contract on a new page
    forms.forEach((form, index) => {
      doc.addPage();

      // Add page number
      doc
        .fontSize(8)
        .fillColor('#95A5A6')
        .text(`Page ${index + 2} of ${forms.length + 1}`, 50, 30, { align: 'right' });

      // Generate contract content
      this.addContractToDocument(doc, form);
    });

    return doc;
  }

  /**
   * Helper to add a single contract to an existing PDF document
   */
  private addContractToDocument(doc: PDFDocument, form: IContractForm): void {
    // Header
    doc
      .fontSize(20)
      .fillColor('#2C3E50')
      .text(form.contractName, 50, 60)
      .moveDown(0.5);

    doc
      .fontSize(11)
      .fillColor('#7F8C8D')
      .text(`Type: ${form.contractType} | Status: ${form.status}`)
      .moveDown(1);

    // Horizontal line
    doc
      .strokeColor('#BDC3C7')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke()
      .moveDown(1);

    // Content
    if (form.contractContent) {
      doc
        .fontSize(10)
        .fillColor('#34495E')
        .text(form.contractContent.substring(0, 800), { align: 'justify' }); // Limit content to prevent overflow
    }

    // Party info (abbreviated for multi-contract PDF)
    doc.moveDown(1);
    if (form.contract_from) {
      doc
        .fontSize(11)
        .fillColor('#2C3E50')
        .text(`Signed by: ${form.contract_from.fullName}`)
        .fontSize(9)
        .fillColor('#7F8C8D')
        .text(`Email: ${form.contract_from.email}`);
    }

    // Timestamps
    doc.moveDown(1);
    doc
      .fontSize(9)
      .fillColor('#95A5A6')
      .text(`Created: ${new Date(form.createdAt).toLocaleString()}`)
      .text(`ID: ${form._id}`);
  }

  /**
   * Convert PDF document to buffer
   */
  async pdfToBuffer(doc: PDFDocument): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const buffers: Buffer[] = [];
      
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);
      
      doc.end();
    });
  }

  /**
   * Get PDF as readable stream
   */
  pdfToStream(doc: PDFDocument): Readable {
    doc.end();
    return doc as unknown as Readable;
  }
}
