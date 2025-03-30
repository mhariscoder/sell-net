import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { parseStringPromise } from 'xml2js'
import { Listing } from './schemas/listing.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { decrypt } from 'src/helper';
import { Marketplace } from '../marketplace/schemas/marketplace.schema';

@Injectable({})
export class ListingService {
    constructor(
        private readonly httpService: HttpService,
        @InjectModel(Listing.name, 'DATABASE_CONNECTION') private readonly listingModel: Model<Listing>,
        @InjectModel(Marketplace.name, 'DATABASE_CONNECTION') private readonly marketplaceModel: Model<Marketplace>,
    ) {}

    async create(data: any): Promise<any> {
 
    }

    async findAll(): Promise<any> {

    }

    async findOne(id: string): Promise<any> {
   
    }

    async update(id: string, data: Partial<any>): Promise<any> {
   
    }


    async delete(id: string): Promise<any> {
   
    }

    async fetchEbayListingsInBatches(store: any): Promise<any> {
       
        try {
            const marketplace = await this.marketplaceModel.findOne({ storeMarketplace: 'ebay' }).exec();
            if (!marketplace) throw new NotFoundException(`Invalid marketplace!`);

            const decryptedToken = marketplace.apiOAuthToken;
            
            
            const processItemIds = async (itemIds: string[]) => {
                for (const itemId of itemIds) {
                    try {
                        await this.fetchEbayListing(itemId, decryptedToken, store);
                    } catch (error) {
                        console.error(`Error processing item ID ${itemId}:`, error);
                    }
                }
            };

            store = {
                fetch: {
                    itemIds: [
                        {
                            itemId: 396249957515
                        }
                    ],
                    specifiedItemIds: true
                },
                
            };

            console.log('store', store)
    
            if (store.fetch.specifiedItemIds) {
                console.log('specifiedItemIds', store.fetch.specifiedItemIds)

                const mapData = await processItemIds(store.fetch.itemIds.map(obj => obj.itemId));
                console.log('mapData', mapData)
                return;
            }
    
            let pageNumber = 1;
            let totalPages = 1;
    
            do {
                const headers = {
                    'X-EBAY-API-SITEID': '0',
                    'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
                    'X-EBAY-API-CALL-NAME': 'GetMyeBaySelling',
                    'X-EBAY-API-IAF-TOKEN': decryptedToken,
                    'Content-Type': 'text/xml;charset=UTF-8',
                };
    
                const body = `
                    <?xml version="1.0" encoding="utf-8"?>
                    <GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">
                        <ErrorLanguage>en_US</ErrorLanguage>
                        <WarningLevel>High</WarningLevel>
                        <ActiveList>
                        <Include>true</Include>
                            <Pagination>
                                <EntriesPerPage>100</EntriesPerPage>
                                <PageNumber>${pageNumber}</PageNumber>
                            </Pagination>
                        </ActiveList>
                    </GetMyeBaySellingRequest>
                `;
        
                const response = await firstValueFrom(
                this.httpService.post('https://api.ebay.com/ws/api.dll', body, { headers }));

                
        
                const jsonData = await parseStringPromise(response.data, { explicitArray: false });

                const items = jsonData.GetMyeBaySellingResponse.ActiveList?.ItemArray?.Item || [];   
                
                console.log('jsonData.GetMyeBaySellingResponse', jsonData.GetMyeBaySellingResponse)
        
                if (pageNumber === 1) {
                    totalPages = parseInt(jsonData.GetMyeBaySellingResponse.ActiveList.PaginationResult.TotalNumberOfPages, 10);
                }
        
                if (items.length > 0) {
                    const itemIds = items.map(item => item.ItemID);
                    console.log('itemIds', itemIds)
                    const existingListings = await this.listingModel
                        .find({ itemId: { $in: itemIds } }, { itemId: 1 })
                        .exec();
                    const existingItemIds = existingListings.map(listing => listing.itemId);
                    const newItemsToProcess = itemIds.filter(itemId => !existingItemIds.includes(itemId));
            
                    await processItemIds(newItemsToProcess);
                    pageNumber++;
                } else {
                    // break;
                }
            } while (pageNumber <= totalPages);
        } catch (error) {
          console.error('Error in fetchEbayListingsInBatches:', error);
        }
    }

    async fetchEbayListing(itemId: string, decryptedToken: string, store: any): Promise<void> {
        

        try {
          const headers = {
            'X-EBAY-API-SITEID': '0',
            'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
            'X-EBAY-API-CALL-NAME': 'GetItem',
            'X-EBAY-API-IAF-TOKEN': decryptedToken,
            'Content-Type': 'text/xml;charset=UTF-8',
          };
    
          const body = `
            <?xml version="1.0" encoding="utf-8"?>
            <GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
              <RequesterCredentials>
                <eBayAuthToken>${decryptedToken}</eBayAuthToken>
              </RequesterCredentials>
              <ErrorLanguage>en_US</ErrorLanguage>
              <WarningLevel>High</WarningLevel>
              <ItemID>${itemId}</ItemID>
            </GetItemRequest>
          `;
    
          const response = await firstValueFrom(
            this.httpService.post('https://api.ebay.com/ws/api.dll', body, { headers }),
          );
    
          const jsonData = await parseStringPromise(response.data, { explicitArray: false });
    
          if (jsonData.GetItemResponse.Ack === 'Failure') {
            const errors = jsonData.GetItemResponse.Errors;
            console.error(`Error fetching item ${itemId}:`, errors);
            return;
          }
    
          const item = jsonData.GetItemResponse.Item;
    
          const listingInfo = {
            title: item.Title,
            startPrice: {
              value: parseFloat(item.StartPrice._),
              immutability: false,
            },
            quantity: parseInt(item.Quantity, 10) - parseInt(item.SellingStatus.QuantitySold, 10),
          };
    
          const listing = {
            itemId: item.ItemID,
            sku: item.SKU,
            storeId: store._id,
            listingInfo: {
              ...listingInfo,
              categoryId: item.PrimaryCategory.CategoryID,
              soldQuantity: parseInt(item.SellingStatus.QuantitySold, 10),
            },
            previousInfo: { ...listingInfo },
            synced: false,
            status: 'sync',
            updateType: 'sync',
          };
    
          const existingListing = await this.listingModel.findOne(item.ItemID);
          if (!existingListing) {
            await this.listingModel.create(listing);
          }
        } catch (error) {
          console.error(`Error in fetchEbayListing for itemId=${itemId}:`, error);
        }
    }

    
    
    async fetchInitialiser(store) {
        try {
            store = null;
            // store = await checkToken(store);
    
            if (!store) throw new Error('Fetching process could not generate OAuth token.');
        
            const decryptedToken = decrypt(store.apiOAuthToken.accessToken);
        
            if (store.storeMarketplace === 'ebay') {
                return this.fetchEbayListingsInBatches(store);
            } else {
                // return fetchAmazonListingsInBatches(store);
            }
    
        } catch (error) {
            throw new Error(error.message);
        } finally {
            // await StoreConfig.findByIdAndUpdate(store._id, {
            //     'fetch.switch': false,
            //     'fetch.specifiedItemIds': false,
            //     'fetch.itemIds': [],
            // });
        }
    }
}
