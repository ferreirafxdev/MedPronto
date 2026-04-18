import PDFDocument from 'pdfkit';

export class PDFTemplate {
    private doc: any;
    private primaryColor = '#0d9488'; // Teal-600
    private secondaryColor = '#0f172a'; // Slate-900

    constructor() {
        // ABNT Margins: Top/Left 3cm (85pt), Bottom/Right 2cm (57pt)
        this.doc = new PDFDocument({
            size: 'A4',
            margins: {
                top: 85,
                left: 85,
                bottom: 57,
                right: 57
            }
        });
    }

    getDocument() {
        return this.doc;
    }

    drawLayout(title: string, doctorName: string, doctorCRM: string) {
        this.drawHeader();
        this.drawTitle(title);
        this.drawFooter(doctorName, doctorCRM);
    }

    private drawHeader() {
        // Geometric Logo - Adjusted for 3cm margin
        this.doc.save();
        this.doc.translate(85, 40); // Within the 3cm top margin
        this.doc.path('M0 0 L15 0 L18 8 L15 16 L0 16 Z').fill(this.primaryColor);
        this.doc.path('M8 -4 L23 -4 L26 4 L23 12 L8 12 Z').fill(this.secondaryColor);
        this.doc.restore();

        // Clinic Info
        this.doc.fillColor(this.secondaryColor)
            .fontSize(16)
            .font('Helvetica-Bold')
            .text('MedPronto', 120, 40);
        
        this.doc.fontSize(8)
            .font('Helvetica')
            .fillColor('#64748b')
            .text('Plataforma de Saúde Digital', 120, 58);

        // Contact Info (Right aligned)
        const rightPos = this.doc.page.width - 57;
        this.doc.fontSize(8)
            .fillColor('#64748b')
            .text('contato@medpronto.com.br', 350, 40, { align: 'right', width: rightPos - 350 })
            .text('São Paulo - SP', 350, 50, { align: 'right', width: rightPos - 350 });

        // Divider Line
        this.doc.moveTo(85, 80)
            .lineTo(rightPos, 80)
            .lineWidth(1)
            .strokeColor(this.primaryColor)
            .stroke();
    }

    private drawTitle(title: string) {
        this.doc.moveDown(1.5);
        this.doc.fontSize(14)
            .font('Helvetica-Bold')
            .fillColor(this.secondaryColor)
            .text(title.toUpperCase(), { align: 'center' });
        this.doc.moveDown(1);
    }

    private drawFooter(doctorName: string, doctorCRM: string) {
        const bottom = this.doc.page.height - 85;

        // Signature Area
        this.doc.moveTo(150, bottom)
            .lineTo(445, bottom)
            .lineWidth(0.5)
            .strokeColor('#94a3b8')
            .stroke();

        this.doc.fontSize(10)
            .font('Helvetica-Bold')
            .fillColor(this.secondaryColor)
            .text(`Dr(a). ${doctorName}`, 150, bottom + 5, { width: 295, align: 'center' });
        
        this.doc.fontSize(8)
            .font('Helvetica')
            .fillColor('#64748b')
            .text(`Registro Profissional: ${doctorCRM}`, 150, bottom + 18, { width: 295, align: 'center' });

        // Bottom disclaimer
        this.doc.fontSize(7)
            .fillColor('#cbd5e1')
            .text('Documento eletrônico validável via QR Code ou no site oficial.', 85, this.doc.page.height - 35, { align: 'center' });
    }

    addContent(content: string) {
        // ABNT: Font Size 12, Spacing 1.5 (lineGap ~ 6pt)
        this.doc.fontSize(12)
            .font('Helvetica')
            .fillColor(this.secondaryColor)
            .text(content, {
                align: 'justify',
                lineGap: 6,
                paragraphGap: 10,
                indent: 35.4 // Indentation: 1.25cm
            });
    }

    finalize() {
        this.doc.end();
    }
}
