import PDFDocument from 'pdfkit';

export class PDFTemplate {
    private doc: any;
    private primaryColor = '#0d9488'; // Teal-600
    private secondaryColor = '#0f172a'; // Slate-900

    constructor() {
        // Optimized margins to save space
        this.doc = new PDFDocument({
            size: 'A4',
            margins: {
                top: 50,    // Reduced from 85
                left: 60,   // Reduced from 85
                bottom: 40, // Reduced from 57
                right: 60   // Reduced from 57
            }
        });
    }

    getDocument() {
        return this.doc;
    }

    drawLayout(title: string) {
        this.drawHeader();
        this.drawTitle(title);
    }

    private drawHeader() {
        // Geometric Logo
        this.doc.save();
        this.doc.translate(60, 25); 
        this.doc.path('M0 0 L15 0 L18 8 L15 16 L0 16 Z').fill(this.primaryColor);
        this.doc.path('M8 -4 L23 -4 L26 4 L23 12 L8 12 Z').fill(this.secondaryColor);
        this.doc.restore();

        // Clinic Info
        this.doc.fillColor(this.secondaryColor)
            .fontSize(16)
            .font('Helvetica-Bold')
            .text('MedPronto', 95, 25);
        
        this.doc.fontSize(8)
            .font('Helvetica')
            .fillColor('#64748b')
            .text('Plataforma de Saúde Digital', 95, 43);

        // Contact Info (Right aligned)
        const rightPos = this.doc.page.width - 60;
        this.doc.fontSize(8)
            .fillColor('#64748b')
            .text('contato@medpronto.com.br', 350, 25, { align: 'right', width: rightPos - 350 })
            .text('São Paulo - SP', 350, 35, { align: 'right', width: rightPos - 350 });

        // Divider Line
        this.doc.moveTo(60, 65)
            .lineTo(rightPos, 65)
            .lineWidth(1)
            .strokeColor(this.primaryColor)
            .stroke();
    }

    private drawTitle(title: string) {
        // Move significantly down to avoid overlapping header line
        this.doc.moveDown(2);
        this.doc.fontSize(15)
            .font('Helvetica-Bold')
            .fillColor(this.secondaryColor)
            .text(title.toUpperCase(), { align: 'center' });
        this.doc.moveDown(1.5);
    }

    private drawFooter(doctorName: string, doctorCRM: string, validationCode?: string) {
        const bottom = this.doc.page.height - 85;
        const rightPos = this.doc.page.width - 60;

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

        // Validation Info
        if (validationCode) {
            this.doc.fontSize(7)
                .fillColor('#475569')
                .text(`CÓDIGO DE VALIDAÇÃO: ${validationCode}`, 60, this.doc.page.height - 55, { width: 400, align: 'left' })
                .text('Para validar este documento, acesse medpronto.com.br/validar e informe o código acima.', 60, this.doc.page.height - 45, { width: 400, align: 'left' });
        }

        // Bottom disclaimer
        this.doc.fontSize(7)
            .fillColor('#cbd5e1')
            .text('Documento eletrônico validável via QR Code ou no site oficial da MedPronto.', 0, this.doc.page.height - 25, { align: 'center', width: this.doc.page.width });
    }

    addContent(content: string) {
        this.doc.fontSize(10)
            .font('Helvetica')
            .fillColor(this.secondaryColor)
            .text(content, {
                align: 'justify',
                lineGap: 2,
                paragraphGap: 6
            });
    }

    addSection(title: string, content: string) {
        this.doc.moveDown(0.8);
        this.doc.fontSize(10).font('Helvetica-Bold').fillColor(this.primaryColor).text(title.toUpperCase());
        this.doc.moveDown(0.2);
        this.doc.fontSize(10).font('Helvetica').fillColor(this.secondaryColor).text(content, {
            align: 'justify',
            lineGap: 1.5
        });
    }

    finalizeWithFooter(doctorName: string, doctorCRM: string, validationCode?: string) {
        this.drawFooter(doctorName, doctorCRM, validationCode);
        this.doc.end();
    }
}
