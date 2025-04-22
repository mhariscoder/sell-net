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

    @Post('fetch-initialiser')
    fetchInitialiser( @Body() data ) {
        return this.listingService.fetchInitialiser(data);
    }

    @Post('ebay-listing-batches')
    fetchEbayListingsInBatches() {
        return this.listingService.fetchEbayListingsInBatches();
    }

    @Get('init-ebay-sync')
    initEbaySync() {
        // return this.listingService.initSync();
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
}
