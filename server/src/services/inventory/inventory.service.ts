// inventory.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import * as xlsx from 'xlsx';
import * as crypto from 'crypto';
import * as mimeTypes from 'mime-types';
import * as moment from 'moment';
import * as AdmZip from 'adm-zip';
import * as Client from 'ssh2-sftp-client';
import { InventoryUpload } from './schemas/inventory-upload.schema';
import { SupplierConfig } from '../supplier-config/schemas/supplier-config.schema';
import { excelFileReader, tabSeparatedFileReader } from 'src/helper';

@Injectable()
export class InventoryService {
  private processing = false;
  private isProcessing = false;
  private sftp: Client = new Client();
  private readonly batchSize = Number(process.env.UPLOAD_CHUNK_SIZE) || 100;
  private readonly basePath = path.join(__dirname, '../../../base/');

  constructor(
    @InjectModel(InventoryUpload.name, 'DATABASE_CONNECTION') private readonly inventoryUploadModel: Model<InventoryUpload>,
    @InjectModel(SupplierConfig.name, 'DATABASE_CONNECTION') private readonly supplierConfigModel: Model<SupplierConfig>
  ) {}

  // SFTP Configuration
  private sftpConfig = {
    host: process.env.SFTP_HOST,
    port: process.env.SFTP_PORT,
    username: process.env.SFTP_USER,
    password: process.env.SFTP_PASS,
  };

  async fetchInventory(): Promise<any> {
    if (this.processing) return { message: 'Processing in progress.' };
    this.processing = true;

    try {
      await this.sftp.connect(this.sftpConfig);
      const inventory = await this.sftp.list('/inventory');

      for (const supplierFolder of inventory.filter(item => item.type === 'd').map(directory => directory.name)) {
        const filesInFolder = await this.sftp.list(`/`);
        const fileNames = this.getSupplierFileNames(supplierFolder, filesInFolder);
        await this.processFiles(supplierFolder, fileNames);
      }

      return { message: 'Inventory processing completed successfully.' };
    } catch (err) {
      console.error('Error:', err.message);
      return { message: 'Error processing inventory.' };
    } finally {
      await this.sftp.end();
      this.processing = false;
    }
  }

  private getSupplierFileNames(supplier: string, filesInFolder: any[]): string[] {
    const totalFiles = filesInFolder.filter(item => item.type === '-').map(file => file.name);

    switch (supplier) {
      case 'carparts':
        return totalFiles.filter(fileName => fileName.split('_')[0] === 'carparts');
      case 'jcAuto':
        return totalFiles.filter(fileName => fileName.split('_')[0] === 'jc');
      case 'expressParts':
        return totalFiles.filter(fileName => fileName.split('_')[0] === 'express');
      case 'jcAutoWholesale':
        return totalFiles.filter(fileName => fileName.split('_')[0] === 'jcw');
      default:
        return [];
    }
  }

  private async processFiles(supplierFolder: string, fileNames: string[]) {
    const sortedFileNames = this.sortSupplierFileNames(fileNames);
    const supplierConfig = await this.supplierConfigModel.findOne({ supplier: supplierFolder });
    const lastInventoryUpload = supplierConfig ? moment(supplierConfig?.lastInventoryUpload).subtract(3, 'hours').toDate() : null;

    for (const fileName of sortedFileNames) {
      const fileDate = moment(fileName.split('_').pop().split('.')[0], 'YYYYMMDD').toDate();

      if (isNaN(fileDate.getTime()) || (lastInventoryUpload && fileDate.getTime() <= lastInventoryUpload.getTime())) {
        continue;
      }


      const existingUpload = await this.inventoryUploadModel.findOne({ supplier: supplierFolder, sourceFileDate: fileDate, source: 'sftp' });
      if (existingUpload) continue;

      const supplierConfig = await this.supplierConfigModel.findOne({ supplier: supplierFolder });
      if (!supplierConfig) continue;

      let fileExtension = path.extname(fileName);
      let localFilePath = path.join(__dirname, '../../../base', 'uploads', fileName);

      await this.sftp.get(`/${fileName}`, localFilePath);

      if (fileExtension === '.zip') {
        await this.unzipZipFile(localFilePath, path.join(__dirname, '../../../base', 'uploads'));
        if (!fs.existsSync(localFilePath.replace('zip', 'txt'))) {
          fs.unlinkSync(localFilePath);
          continue;
        }

        fileExtension = path.extname(localFilePath.split('/').pop().replace('.zip', '.txt'));
        localFilePath = localFilePath.replace('.zip', '.txt');
      }

      const mimetype = mimeTypes.lookup(fileExtension);
      if (mimetype !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && mimetype !== 'text/plain') {
        fs.unlinkSync(localFilePath);
        continue;
      }

      const supplierFormatFilePath = path.join(__dirname, '../../../base', 'formatFiles', 'supplierFormats', `${supplierConfig.supplier}.xlsx`);
      const supplierFormatWorkbook = xlsx.readFile(supplierFormatFilePath, { sheetRows: 1 });
      const supplierFormat = xlsx.utils.sheet_to_json(supplierFormatWorkbook.Sheets[supplierFormatWorkbook.SheetNames[0]], { header: 1 })[0];

      let uploadedFormat = [];

      if (mimetype === 'text/plain') {
        const fileContent = fs.readFileSync(localFilePath, 'utf8');
        uploadedFormat = fileContent.split('\n').map(row => row.split('\t').map(cell => cell.replace(/"/g, '')));
      } else {
        const uploadedWorkbook = xlsx.readFile(localFilePath, { sheetRows: 2 });
        uploadedFormat = xlsx.utils.sheet_to_json(uploadedWorkbook.Sheets[uploadedWorkbook.SheetNames[0]], { header: 1 });
      }

      if (JSON.stringify(supplierFormat) !== JSON.stringify(uploadedFormat[0])) {
        fs.unlinkSync(localFilePath);
        continue;
      }

      const newFileName = crypto.randomBytes(16).toString('hex') + fileExtension;
      const newDirectory = path.join(__dirname, '../../../base', 'inventoryUploads', newFileName);
      fs.mkdirSync(newDirectory, { recursive: true });

      const newFilePath = path.join(newDirectory, newFileName);
      fs.renameSync(localFilePath, newFilePath);

      await this.inventoryUploadModel.updateMany({ supplierId: supplierConfig._id }, { expired: true });

      const newUpload = new this.inventoryUploadModel({
        fileName: newFileName,
        supplierId: supplierConfig._id,
        supplier: supplierConfig.supplier,
        chunked: false,
        expired: false,
        syncedStores: [],
        sourceFileDate: fileDate,
        source: 'sftp',
      });

      await newUpload.save();
      supplierConfig.lastInventoryUpload = newUpload.createdAt;
      await supplierConfig.save();

      await this.inventoryUploadModel.updateMany(
        {
          $or: [
            { supplierId: supplierConfig._id },
            { supplierId: { $exists: false } },
          ],
        },
        { synced: false },
      );
    }
  }

  private sortSupplierFileNames(fileNames: string[]): string[] {
    return fileNames
      .filter(date => moment(date.split('_').pop().split('.')[0], 'YYYYMMDD').isValid())
      .sort((a, b) => {
        const aDate = moment(a.split('_').pop().split('.')[0], 'YYYYMMDD').toDate();
        const bDate = moment(b.split('_').pop().split('.')[0], 'YYYYMMDD').toDate();
        return bDate.getTime() - aDate.getTime();
      });
  }

  private unzipZipFile(zipFilePath: string, outputFolderPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const zip = new AdmZip(zipFilePath);
      try {
        zip.extractAllTo(outputFolderPath, true);
        resolve('File unzipped successfully.');
      } catch (error) {
        reject(error);
      }
    });
  }

  private configurePrices(json: any, supplier: string) {
    const price = (key: string) => {
      if (typeof json[key] !== 'string') {
        return parseFloat(json[key]);
      }
      return parseFloat(json[key].replace(/\$/g, ''));
    };

    let prices;
    switch (supplier) {
      case 'carparts':
        prices = {
          cost: price('COST'),
          shipping: price('SHIPPING_COST'),
          handlingCost: price('HANDLING_COST'),
        };
        break;
      case 'expressParts':
        prices = {
          avgCost: price('Avg Cost'),
          lastCost: price('Last Cost'),
          lastAddedCost: price('Last Added Cost'),
          net: price('NET'),
        };
        break;
      case 'jcAuto':
        prices = {
          ec_price: price('EC_Price'),
        };
        break;
      case 'jcAutoWholesale':
        prices = {
          cost: price('$LandedCost'),
        };
        break;
      case 'leftovers':
        prices = {
          cost: price('cost'),
        };
        break;
    }

    return prices;
  }

  async processInventoryUploads() {
    

    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const uploadsToProcess = await this.inventoryUploadModel.find({ chunked: false });
      const supplierConfigs = await this.supplierConfigModel.find();

      for (const upload of uploadsToProcess) {
        const filePath = path.join(this.basePath, 'inventoryUploads', upload.fileName, upload.fileName);
        const mimetype = mimeTypes.lookup(filePath);

        let uploadData = mimetype === 'text/plain'
          ? tabSeparatedFileReader(filePath)
          : excelFileReader(filePath);

        const totalChunks = Math.ceil(uploadData.length / this.batchSize);
        upload.totalChunks = totalChunks;
        upload.chunked = true;
        upload.chunks = [];

        for (let i = 0; i < totalChunks; i++) {
          const chunkData = uploadData.slice(i * this.batchSize, (i + 1) * this.batchSize);
          const supplierConfig = await this.supplierConfigModel.findOne({ supplier: upload.supplier });

          const quantitySource = (quantity) => 
            upload.source === 'system'
              ? Math.max(parseInt(quantity) - supplierConfig.backupInventoryHandlingSubtractionQuantity, 0)
              : quantity;

          const results = chunkData.map(json => {
            let supplierQuery;
            let prices = this.configurePrices(json, upload.supplier);

            switch (upload.supplier) {
              case 'carparts':
                supplierQuery = {
                  supplier: upload.supplier,
                  itemNumber: json.SKU,
                  oem: json.OEM_NUMBER,
                  partslink: json.PARTSLINK ? json.PARTSLINK : json.SKU,
                  prices: prices,
                  quantity: quantitySource(parseInt(json.STOCK_TOTAL)),
                  description: json.PDESCRIPTION,
                };
                break;
              case 'expressParts':
                supplierQuery = {
                  supplier: upload.supplier,
                  itemNumber: json["Item Number"],
                  oem: json.OEM,
                  partslink: json.PARTSLINK,
                  prices: prices,
                  quantity: quantitySource(json["Quantity in Stock"]),
                  description: json.Description,
                };
                break;
              case 'jcAuto':
                supplierQuery = {
                  supplier: upload.supplier,
                  itemNumber: json["Item No."],
                  oem: json.OEM,
                  partslink: json["Alt Num"],
                  prices: prices,
                  quantity: quantitySource(json.EC_Qty),
                  description: json.Desc,
                  weightLb: parseFloat(json["Unit Wt lb"]),
                };
                break;
              case 'jcAutoWholesale':
                supplierQuery = {
                  supplier: upload.supplier,
                  itemNumber: json["PL#"],
                  oem: json["OEM#"],
                  partslink: json["PL#"],
                  prices: prices,
                  quantity: quantitySource(json["In Stock"]),
                  description: json["Description"],
                };
                break;
              case 'leftovers':
                supplierQuery = {
                  supplier: upload.supplier,
                  itemNumber: json["sku"],
                  oem: '',
                  partslink: json["itemNumber"],
                  prices: prices,
                  quantity: quantitySource(json["quantity"]),
                  description: '',
                };
                break;
            }

            let infoJson = { ...json };
            for (let key in supplierQuery) {
              delete infoJson[key];
            }
            supplierQuery.info = infoJson;

            return supplierQuery;
          });

          if (!supplierConfig) {
            console.error('No matching supplier found for', upload.supplier);
            continue;
          }

          const chunkFileName = `${i + 1}.json`;
          const chunkFilePath = path.join(this.basePath, 'inventoryUploads', upload.fileName, chunkFileName);
          fs.writeFileSync(chunkFilePath, JSON.stringify(results, null, 2));

          upload.chunks.push({
            fileName: chunkFileName,
            chunked: true,
          });
        }

        await upload.save();
      }
    } catch (error) {
      console.error(`Failed to process inventory uploads: ${error}`);
    } finally {
      this.isProcessing = false;
    }
  }

  async readFileData(filePath: string, isTabSeparated: boolean) {
    const data = isTabSeparated ? tabSeparatedFileReader(filePath) : excelFileReader(filePath);
    console.log('File Data:', data);
  }
}
