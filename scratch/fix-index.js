const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../backend/src/index.ts');
let content = fs.readFileSync(filePath, 'utf8');

const oldLine = 'const [patient] = await sql`SELECT * FROM queue WHERE patient_id = ${patientId} LIMIT 1`;';
const newLine = `const [patient] = await sql\`
        SELECT q.*, p.cpf, p.birth_date 
        FROM queue q
        JOIN patients p ON q.patient_id = p.id
        WHERE q.patient_id = \${patientId} 
        LIMIT 1
    \`;`;

// Replace all occurrences
content = content.replace(new RegExp(oldLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newLine);

fs.writeFileSync(filePath, content);
console.log('✅ index.ts atualizado com JOINS!');
