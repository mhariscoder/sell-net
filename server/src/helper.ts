import * as fs from 'fs';
import * as xlsx from 'xlsx';
import * as crypto from 'crypto';

const algorithm = 'aes-256-cbc';
const secretKey = 'secret';
const iv = crypto.randomBytes(16);

// Convert time in "hh:mm AM/PM" format to cron expression
export const timeToCron = (time: string): string => {
  const [hours, minutes] = time.split(" ")[0].split(':');
  const isPM = time.includes('PM');

  // Convert hours to 24-hour format
  let cronHours = parseInt(hours, 10);

  if (isPM && cronHours !== 12) {
    cronHours += 12; // Add 12 hours for PM
  } else if (!isPM && cronHours === 12) {
    cronHours = 0; // Midnight (12:00 AM) is 0 in 24-hour format
  }

  // Build the cron expression
  const cronExpression = `${minutes} ${cronHours} * * *`;
  return cronExpression;
};

// Reads a tab-separated file and converts it into an array of objects
export const tabSeparatedFileReader = (filePath: string): any[] => {
  const data = [];

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const rawRows = fileContent
    .split('\n')
    .map(row => row.split('\t').map(cell => cell.replace(/"/g, '')));

  const header = rawRows[0];
  const rows = rawRows.slice(1);

  for (const row of rows) {
    const obj = {};

    for (const [index, heading] of header.entries()) {
      obj[heading] = row[index];
    }

    data.push(obj);
  }

  return data;
};

// Reads an Excel file and converts the first sheet into JSON
export const excelFileReader = (filePath: string): any[] => {
  const workbook = xlsx.readFile(filePath);
  const sheetNameList = workbook.SheetNames;
  return xlsx.utils.sheet_to_json(workbook.Sheets[sheetNameList[0]]);
};

// Encrypt a given text using AES-256-CBC
export const encrypt = (text: string): { iv: string; content: string } => {
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return {
    iv: iv.toString('hex'),
    content: encrypted.toString('hex')
  };
};

// Decrypt a given encrypted text using AES-256-CBC
export const decrypt = (hash: { iv: string; content: string }): string => {
  const decipher = crypto.createDecipheriv(algorithm, secretKey, Buffer.from(hash.iv, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(hash.content, 'hex')), decipher.final()]);
  return decrypted.toString();
};

// Retrieve all permissions from a user based on their roles and permissions
export const getPermissionsFromUser = async (user: any): Promise<string[]> => {
  const permissions: string[] = [];
  await user?.roles?.forEach(async (role: any) => {
    await role?.permissions?.forEach(async (permission: any) => {
      await permissions.push(permission?.name);
    });
  });

  return permissions;
};
