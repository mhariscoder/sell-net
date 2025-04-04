// inventory.controller.ts
import { Controller, Get, Post, Param, Patch, Delete, Body } from '@nestjs/common';
import { InventoryService } from './inventory.service';

@Controller('v1/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // Trigger fetch inventory process
  @Get('fetch')
  async fetchInventory(): Promise<any> {
    return this.inventoryService.fetchInventory();
  }

  @Get('process-uploads')
  async processUploads() {
    try {
      await this.inventoryService.processInventoryUploads();
      return { message: 'Inventory uploads processed successfully.' };
    } catch (error) {
      console.error(error);
      return { message: 'Failed to process inventory uploads.', error };
    }
  }

  @Get('read-file/:filePath/:isTabSeparated')
  async readFile(@Param('filePath') filePath: string, @Param('isTabSeparated') isTabSeparated: boolean) {
    await this.inventoryService.readFileData(filePath, isTabSeparated === true);
    return { message: 'File processed' };
  }
}
