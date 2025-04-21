import * as fs from 'fs';
import * as xlsx from 'xlsx';
import * as crypto from 'crypto';
import * as iconv from 'iconv-lite';
import * as path from 'path';
import * as csvParser from 'csv-parser';

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

// Function to format sku 
export const formatEbaySku = (sku = null) => {
  const parts = sku.split(/[-_]/g);

  if (parts.length === 1) {
    return sku; // If there's only one part, return the original SKU.
  }

  for (const [index, part] of parts.entries()) {
    if (part.length === 1) {
      return `${parts[index - 1]}-${part}`
    }
  }

  // Find the longest part by character count, including numbers.
  let longestPart = '';
  let longestPartLength = 0;

  for (const part of parts) {
    const partLength = part.replace(/\D/g, '').length; // Count of numbers in the part.

    if (part.length + partLength > longestPartLength) {
      longestPart = part;
      longestPartLength = part.length + partLength;
    }
  }

  return longestPart;
};

export const parseCsv = async (filePath: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const result: any[] = [];

    try {
      const fileBuffer = fs.readFileSync(filePath);
      const fileWithoutBOM = iconv.decode(fileBuffer, 'utf8').replace(/^\uFEFF/, '');

      const tempFilePath = path.join(__dirname, 'uploads', 'cleaned-up-' + Date.now() + '.csv');
      fs.writeFileSync(tempFilePath, fileWithoutBOM, 'utf8');

      const stream = fs.createReadStream(tempFilePath)
        .pipe(csvParser())
        .on('data', (row) => result.push(row))
        .on('end', () => {
          fs.unlinkSync(tempFilePath);
          resolve(result);
        })
        .on('error', (err) => {
          fs.unlinkSync(tempFilePath);
          reject(err);
        });
    } catch (err) {
      reject(err);
    }
  });
};

export const calculateQuantity = (inventoryQuantity, startPrice, quantitySetup) => {
  let quantity = inventoryQuantity;
  let priceRangeUpdated = false;
  let thresholdAdjusted = false;

  // Apply quantity offset if needed
  if (quantitySetup.quantityOffset) {
    const { value, percentage } = quantitySetup.quantityOffset;

    if (percentage) {
      // Apply percentage-based offset
      quantity *= (1 - value / 100);
      quantity = Math.round(quantity);
    } else {
      // Apply unit-based offset
      quantity -= value;
    }

    // Ensure quantity doesn't go below 0
    quantity = Math.max(quantity, 0); 
  }

  // Apply allowed quantity based on price range
  for (const range of quantitySetup.quantitiesByPriceRange) {
    if (startPrice >= range.minPrice && startPrice <= range.maxPrice) {
      quantity = Math.min(quantity, range.allowedQuantity);
      priceRangeUpdated = true;
      break; // No further updates needed
    }
  }

  // Apply max quantity limit if enabled
  if (!priceRangeUpdated && quantitySetup.defaultMaxQuantityLimitEnabled && quantitySetup.defaultMaxQuantityLimit) {
    quantity = Math.min(quantity, quantitySetup.defaultMaxQuantityLimit);
  }

  // Apply quantity threshold adjustments
  for (const adjustment of quantitySetup.quantityThresholdAdjustments) {
    if (adjustment.comparisonOperator === '>') {
      if (quantity > adjustment.thresholdValue) {
        quantity = adjustment.adjustedValue;
        thresholdAdjusted = true;
        break; // No further updates needed
      }
    } else if (adjustment.comparisonOperator === '<') {
      if (quantity < adjustment.thresholdValue) {
        quantity = adjustment.adjustedValue;
        thresholdAdjusted = true;
        break; // No further updates needed
      }
    } else if (adjustment.comparisonOperator === '=') {
      if (quantity === adjustment.thresholdValue) {
        quantity = adjustment.adjustedValue;
        thresholdAdjusted = true;
        break; // No further updates needed
      }
    }
  }

  return quantity;
};