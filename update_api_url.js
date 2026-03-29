const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) { 
      results.push(file);
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'saas-app/src'));

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes("'http://localhost:3001'")) {
    content = content.split("'http://localhost:3001'").join("import.meta.env.VITE_API_URL || 'http://localhost:3001'");
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated ' + file);
  }
}
console.log('Done!');
