import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../../data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const saveJSON = (filename, data) => {
  const filePath = path.join(dataDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✓ Đã lưu: ${filePath}`);
  return filePath;
};

export const saveCSV = (filename, data) => {
  const filePath = path.join(dataDir, filename);
  
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Data phải là array và không rỗng');
  }

  const headers = Object.keys(data[0]);
  const csvRows = data.map(row => 
    headers.map(header => `"${row[header] || ''}"`).join(',')
  );

  const csvContent = [headers.join(','), ...csvRows].join('\n');
  fs.writeFileSync(filePath, csvContent, 'utf-8');
  console.log(`✓ Đã lưu: ${filePath}`);
  return filePath;
};