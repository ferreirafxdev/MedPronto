import PDFDocument from 'pdfkit';

export class PDFTemplate {
    private doc: any;
    private primaryColor = '#0d9488'; // Teal-600
    private secondaryColor = '#0f172a'; // Slate-900

    constructor() {
        this.doc = new PDFDocument({
            margin: 50,
            size: 'A4'
        });
    }

    getDocument() {
        return this.doc;
    }

    /**
     * Draws the main layout frame, header, and footer
     */
    drawLayout(title: string, doctorName: string, doctorCRM: string) {
        this.drawHeader();
        this.drawTitle(title);
        this.drawFooter(doctorName, doctorCRM);
        this.drawBorders();
    }

    private drawHeader() {
        // Geometric Logo
        this.doc.save();
        this.doc.translate(50, 45);
        this.doc.path('M0 0 L20 0 L25 10 L20 20 L0 20 Z').fill(this.primaryColor);
        this.doc.path('M10 -5 L30 -5 L35 5 L30 15 L10 15 Z').fill(this.secondaryColor);
        this.doc.restore();

        // Clinic Info
        this.doc.fillColor(this.secondaryColor)
            .fontSize(20)
            .font('Helvetica-Bold')
            .text('MedPronto', 90, 45);
        
        this.doc.fontSize(8)
            .font('Helvetica')
            .fillColor('#64748b')
            .text('Plataforma de Gestão em Saúde Digital', 90, 68);

        this.doc.fontSize(9)
            .fillColor(this.secondaryColor)
            .text('contato@medpronto.com.br', 400, 45, { align: 'right' })
            .text('www.medpronto.com.br', 400, 58, { align: 'right' })
            .text('São Paulo - Brasil', 400, 71, { align: 'right' });

        // Divider Line
        this.doc.moveTo(50, 95)
            .lineTo(545, 95)
            .lineWidth(2)
            .strokeColor(this.primaryColor)
            .stroke();
    }

    private drawTitle(title: string) {
        this.doc.moveDown(3);
        this.doc.fontSize(18)
            .font('Helvetica-Bold')
            .fillColor(this.secondaryColor)
            .text(title.toUpperCase(), { align: 'center' });
        this.doc.moveDown(2);
    }

    private drawFooter(doctorName: string, doctorCRM: string) {
        const bottom = this.doc.page.height - 100;

        // Signature Area
        this.doc.moveTo(150, bottom)
            .lineTo(445, bottom)
            .lineWidth(1)
            .strokeColor('#cbd5e1')
            .stroke();

        this.doc.fontSize(10)
            .font('Helvetica-Bold')
            .fillColor(this.secondaryColor)
            .text(`Dr(a). ${doctorName}`, 150, bottom + 10, { width: 295, align: 'center' });
        
        this.doc.fontSize(9)
            .font('Helvetica')
            .fillColor('#64748b')
            .text(`registro Profissional: ${doctorCRM}`, 150, bottom + 25, { width: 295, align: 'center' });

        // Bottom Bar info
        this.doc.fontSize(7)
            .fillColor('#94a3b8')
            .text('Documento assinado digitalmente via MedPronto - Validável em www.medpronto.com.br/valida', 50, this.doc.page.height - 40, { align: 'center' });
    }

    private drawBorders() {
        this.doc.rect(20, 20, 555, 802)
            .lineWidth(0.5)
            .strokeColor('#e2e8f0')
            .stroke();
    }

    addContent(content: string) {
        this.doc.fontSize(12)
            .font('Helvetica')
            .fillColor(this.secondaryColor)
            .text(content, {
                align: 'justify',
                lineGap: 5
            });
    }

    finalize() {
        this.doc.end();
    }
}
