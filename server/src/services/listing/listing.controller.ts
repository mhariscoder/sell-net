import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ListingService } from './listing.service';

@Controller('v1/listing')
export class ListingController {
    constructor(private readonly listingService: ListingService) {}

    // ✅ Create Marketplace
    @Post()
    create(@Body() data) {
        return this.listingService.create(data);
    }

    // ✅ Get All Marketplaces
    @Get()
    findAll() {
        return this.listingService.findAll();
    }

    // ✅ Get Marketplace by ID
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.listingService.findOne(id);
    }

    // ✅ Update Marketplace
    @Patch(':id')
    update(@Param('id') id: string, @Body() data: Partial<any>) {
        return this.listingService.update(id, data);
    }

    // ✅ Delete Marketplace
    @Delete(':id')
    delete(@Param('id') id: string) {
        return this.listingService.delete(id);
    }

    @Post('ebay-listing-batches')
    fetchEbayListingsInBatches(@Body() data) {
        return this.listingService.fetchEbayListingsInBatches(data);
    }
}
