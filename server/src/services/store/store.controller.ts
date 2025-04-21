import { Controller, Get, Post, Body, Param, Put, Delete, Patch, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { StoreService } from './store.service';
import { Store } from './schemas/store.schema';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';


import { diskStorage } from 'multer';
import { parseCsv } from 'src/helper';

@Controller('v1/store')
export class StoreController {
    constructor(private readonly storeService: StoreService) {}

    // Create a new Store
    @Post()
    async createStore(@Body() store): Promise<Store> {
        return this.storeService.createStore(store);
    }

    // Get all stores
    @Get()
    async getAllStores(): Promise<Store[]> {
        return this.storeService.getAllStores();
    }

    // Get a store by ID
    @Get(':id')
    async getStoreById(@Param('id') id: string): Promise<Store> {
        return this.storeService.getStoreById(id);
    }

    // Update a store by ID
    @Patch(':id')
    async updateStore(
        @Param('id') id: string,
        @Body() store
    ): Promise<Store> {
        return this.storeService.updateStore(id, store);
    }

    // Delete a store by ID
    @Delete(':id')
    async deleteStore(@Param('id') id: string): Promise<any> {
        return this.storeService.deleteStore(id);
    }

    @Post('upload-csv')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: (req, file, cb) => {
                const uploadPath = path.join(__dirname, 'uploads');
                // Ensure the uploads directory exists
                if (!fs.existsSync(uploadPath)) {
                    fs.mkdirSync(uploadPath);
                }
                cb(null, uploadPath);
            },
            filename: (req, file, cb) => {
                const filename = Date.now() + '-' + file.originalname; // Ensuring unique filenames
                cb(null, filename);
            }
        }),
        limits: { fileSize: 10 * 1024 * 1024 } // 10MB file size limit
    }))
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No file uploaded or unexpected field.');
        }

        try {
            // Ensure file is a CSV file
            const allowedMimeTypes = ['text/csv', 'application/vnd.ms-excel'];
            if (!allowedMimeTypes.includes(file.mimetype)) {
                throw new BadRequestException('Invalid file type. Only CSV files are allowed.');
            }

            // Log the file details to ensure filename is set correctly
            console.log('Uploaded file:', file);

            // Save the file path
            const filePath = path.join(__dirname, 'uploads', file.filename);

            // Parse CSV and process data
            const data = await parseCsv(filePath);

            // Import the parsed data to the database
            await this.storeService.importData(data);

            // Clean up the uploaded file
            fs.unlinkSync(filePath);

            return { message: 'CSV file uploaded and data imported successfully' };
        } catch (error) {
            console.error('Error processing the file:', error);
            throw new BadRequestException(`File processing failed: ${error.message}`);
        }
    }

    
}
