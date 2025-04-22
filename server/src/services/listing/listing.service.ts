import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { parseStringPromise } from 'xml2js'
import * as xmlbuilder from 'xmlbuilder';
import { Listing } from './schemas/listing.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { decrypt } from 'src/helper';
import { Marketplace } from '../marketplace/schemas/marketplace.schema';
import { Store } from '../store/schemas/store.schema';
import PriceCalculatorSupplier from '../../utils/priceCalculatorSupplier';
import { CalculateShippingCost } from 'src/utils/calculateShippingCost';
import { CalculateQuantity } from 'src/utils/calculateQuantity';
import { HasInventoryChanged } from 'src/utils/hasInventoryChanged';
import { BestSupplierItemOption } from 'src/utils/bestSupplierItemOption';
import { FormatEbaySku } from 'src/utils/formatSku';
import { GetMatchingInventoryItems } from 'src/utils/getMatchingInventoryItems';
import { CombineSetItems } from 'src/utils/combineSetItems';

@Injectable({})
export class ListingService {
    constructor(
        private readonly httpService: HttpService,
        @InjectModel(Listing.name, 'DATABASE_CONNECTION') private readonly listingModel: Model<Listing>,
        @InjectModel(Marketplace.name, 'DATABASE_CONNECTION') private readonly marketplaceModel: Model<Marketplace>,
        @InjectModel(Store.name, 'DATABASE_CONNECTION') private readonly storeModel: Model<Store>
    ) {}

    // Create a new listing
    async create(data: any): Promise<Listing> {
        try {
            const existingListing = await this.listingModel.findOne({ itemId: data.itemId });
            if (existingListing) {
                throw new ConflictException('Listing with this itemId already exists');
            }
            const newListing = new this.listingModel(data);
            return await newListing.save();
        } catch (error) {
            throw new Error('Error creating listing: ' + error.message);
        }
    }

    // Get all listings
    async findAll(): Promise<Listing[]> {
        try {
            return await this.listingModel.find().exec();
        } catch (error) {
            throw new Error('Error fetching all listings: ' + error.message);
        }
    }

    // Get a specific listing by ID
    async findOne(id: string): Promise<Listing> {
        try {
            const listing = await this.listingModel.findById(id).exec();
            if (!listing) {
                throw new NotFoundException(`Listing with id ${id} not found`);
            }
            return listing;
        } catch (error) {
            throw new Error('Error fetching listing: ' + error.message);
        }
    }

    // Update a listing by ID
    async update(id: string, data: Partial<Listing>): Promise<Listing> {
        try {
            const updatedListing = await this.listingModel.findByIdAndUpdate(id, data, { new: true }).exec();
            if (!updatedListing) {
                throw new NotFoundException(`Listing with id ${id} not found`);
            }
            return updatedListing;
        } catch (error) {
            throw new Error('Error updating listing: ' + error.message);
        }
    }

    // Delete a listing by ID
    async delete(id: string): Promise<any> {
        try {
            const deletedListing = await this.listingModel.findByIdAndDelete(id).exec();
            if (!deletedListing) {
                throw new NotFoundException(`Listing with id ${id} not found`);
            }
            return { message: 'Listing deleted successfully' };
        } catch (error) {
            throw new Error('Error deleting listing: ' + error.message);
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
        
            const existingListing = await this.listingModel.findOne({ itemId: item.ItemID });
            if (!existingListing) {
                await this.listingModel.create(listing);
            }
        } catch (error) {
          console.error(`Error in fetchEbayListing for itemId=${itemId}:`, error);
        }
    }

    async fetchEbayListingsInBatches(): Promise<any> {
       
        try {
            const marketplace = await this.marketplaceModel.findOne({ storeMarketplace: 'ebay' }).exec();
            if (!marketplace) throw new NotFoundException(`Invalid marketplace!`);

            const store = await this.storeModel.findOne({ "fetch.switch": true });
            if (!store) throw new NotFoundException(`Invalid store!`);

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
    
            if (store.fetch.specifiedItemIds) {
                console.log('specifiedItemIds', store.fetch.specifiedItemIds)

                const mapData = await processItemIds(store.fetch.itemIds);
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
                    break;
                }
            } while (pageNumber <= totalPages);
        } catch (error) {
          console.error('Error in fetchEbayListingsInBatches:', error);
        }
    }

    async fetchInitialiser(store: any) {
        try {
            if(!store.storeMarketplace) throw new Error('Please give the valid marketplace');

            if (store.storeMarketplace === 'ebay') {
                return this.fetchEbayListingsInBatches();
            } 
            
            // if (store.storeMarketplace === 'amazon') {
            //     return this.fetchAmazonListingsInBatches();
            // }
    
        } catch (error) {
            throw new Error(error.message);
        } finally {
            await this.storeModel.findByIdAndUpdate(store._id, {
                'fetch.switch': false,
                'fetch.specifiedItemIds': false,
                'fetch.itemIds': [],
            });
        }
    }

    // async initSync() {
    //     try {
    //         const listings = await this.listingModel.find({
    //             status: 'sync',
    //             synced: false,
    //             // storeId: { $in: nonSyncedStores.map(store => store._id) }
    //           }).exec();

    //         if(listings && listings?.length > 0) {
    //             listings?.forEach((listing) => {
    //                 // this.ebayUpdateSyncedListing(
    //                 //     true,
    //                 //     null,
    //                 //     listing,

    //                 // );
    //             });
    //         }

    //         console.log('listings', listings);
    //     } catch (error) {
    //         console.error('error', error)
    //     }
    // }

    syncListing = async (
        listing,
        supplierInventoryMaps,
        { stores, suppliers }
      ) => {
        const OriginalSku = listing.sku;
        let listingIsSet = false;
      
        // remove prvious errors
        await this.listingModel.updateOne({ _id: listing._id }, { $set: { errorLogs: [] } });
      
        // Store configuration
        const store = stores[listing.storeId];
        const decryptedToken = decrypt(store.apiOAuthToken.accessToken);
      
        if (/\s/.test(listing.sku)) {
          listing.sku = listing.sku
            .trim()
            .split(" ")
            .map(sku => FormatEbaySku(sku));
      
          listingIsSet = true;
        } else {
          listing.sku = FormatEbaySku(listing.sku).trim();
        };
      
        let inventoryItems = GetMatchingInventoryItems(
          listing.sku,
          listingIsSet,
          store,
          supplierInventoryMaps
        );
      
        if (listingIsSet && inventoryItems) {
          inventoryItems = CombineSetItems(inventoryItems, listing.sku, suppliers);
          listing.sku = listing.sku.join(' ');
        };
      
        const errorRecord = {
          errorSwitch: false,
          majorError: false,
          error: null,
        };
      
        // revise listing
        if (listing.updateType === 'revise') {
          this.reviseListing(decryptedToken, store, suppliers, listing, errorRecord);
      
          if (errorRecord.errorSwitch && errorRecord.majorError) {
            return { error: errorRecord.error };
          } else {
            return false;
          }
        }
      
        // item not available
        if (inventoryItems.length === 0) {
          if (!errorRecord.errorSwitch && store.storeMarketplace === "ebay") {
            await this.ebayUpdateSyncedListing(
                false, 
                errorRecord, 
                listing,

                // enhanced params
                null,
                null,
                null,
            );
          } 
        //   else if (!errorRecord.errorSwitch && store.storeMarketplace === "amazon") {
        //     await this.amazonUpdateSyncedListing(
        //         false,
        //         errorRecord,
        //         listing,
        //         {
        //             sellerId: store.marketplaceOptions.sellerId,
        //             marketplaceId: store.marketplaceOptions.marketplaceId,
        //             issueLocale: store.marketplaceOptions.issueLocale
        //         }
        //     );
        //   }
      
          if (errorRecord.errorSwitch && errorRecord.majorError) {
            return { error: errorRecord.error }
          };
      
          await this.updateDatabaseSyncedListing(
            false, 
            false, 
            listing, 
            errorRecord.errorSwitch,

            // enhanced params
            null,
            null,
            null,
        );
          return false;
        }
      
        const inventoryItem = await BestSupplierItemOption(
          [...inventoryItems],
          listing,
          store,
          suppliers
        );
      
        try {
          const supplierId = inventoryItem.supplierId;
      
          const supplierConfig = suppliers[`${supplierId}-config`];
          const shippingInfo = suppliers[`${supplierId}-shipping`];
          const shippingCost = await CalculateShippingCost(shippingInfo, inventoryItem, listing.sku);
      
          const inventoryQuantity = parseInt(inventoryItem.quantity);
      
          if (!HasInventoryChanged(listing, inventoryItem)) {
            await this.listingModel.findByIdAndUpdate(listing._id, { synced: true });
            return false;
          }
      
          const storeMarkUp = store.supplierMarkUps.find(obj => obj.supplierId.toString() === supplierId.toString()).markUpPercent / 100;
      
          const calculator = PriceCalculatorSupplier.getCalculator(
            supplierConfig.supplier,
            storeMarkUp + 1,
            inventoryItem.prices,
            supplierConfig.priceFormulas,
            shippingCost
          );
      
          let { price: sellingPrice, formula } = calculator.calculate();
          
          if (sellingPrice === null) {
            // console.error(`jobs => storeSyncing => func syncListing: ${listing.sku}:`, "selling price not avaliable");
            await this.listingModel.updateOne(
              { _id: listing._id },
              { $push: { "errorLogs": { id: "selling price not avaliable", message: formula } } });
      
            if (!errorRecord.errorSwitch && store.storeMarketplace === "ebay") {
                await this.ebayUpdateSyncedListing(
                    false, 
                    errorRecord, 
                    listing,
            
                    // enhanced params
                    null,
                    null,
                    null
                );
            } 
            
            // else if (!errorRecord.errorSwitch && store.storeMarketplace === "amazon") {
            //   await amazonUpdateSyncedListing(
            //     decryptedToken,
            //     false,
            //     errorRecord,
            //     listing,
            //     {
            //       sellerId: store.marketplaceOptions.sellerId,
            //       marketplaceId: store.marketplaceOptions.marketplaceId,
            //       issueLocale: store.marketplaceOptions.issueLocale
            //     }
            //   );
            // }
      
            if (errorRecord.errorSwitch && errorRecord.majorError) {
              return { error: errorRecord.error };
            }
      
            errorRecord.errorSwitch = true;
            await this.updateDatabaseSyncedListing(false, false, listing, errorRecord.errorSwitch, null, null, null);
          }
      
          const suppliersPrices = await this.getSuppliersPrices(store, suppliers, inventoryItems, listing);
      
          // // express parts change
          // if (!shippingCost && supplierConfig.supplier === "expressParts") {
          //   sellingPrice = parseFloat(inventoryItem.prices.net);
          // } // needs changing
      
          if (store.storeMarketplace === "amazon") {
            listing.sku = OriginalSku;
          } else if (
            supplierConfig.skuPrefix &&
            store.storeMarketplace === "ebay"
          ) {
            listing.sku = `${supplierConfig.skuPrefix}-${listing.sku}`;
          }
      
          const sku = listing.sku;
          const title = listing.listingInfo.title;
      
          const fixedPrice = listing.listingInfo.startPrice.immutability;
      
          let startPrice = fixedPrice
            ? listing.listingInfo.startPrice.value
            : parseFloat(sellingPrice.toFixed(3)).toFixed(2);
      
          const competitorInfo = listing?.competitorInfo;
      
          if (listing?.supplierCostAdjustment && listing?.competitorInfo && !fixedPrice) {
            const {
              netPercent,
              costPercent,
              ebayCostPercent,
              competitorPrice
            } = listing.competitorInfo;
      
            const costCalculator = PriceCalculatorSupplier.getCalculator(
              supplierConfig.supplier,
              1,
              inventoryItem.prices,
              supplierConfig.priceFormulas,
              shippingCost
            );
      
            let { price: cost } = costCalculator.calculate();
      
            let ebayCost = cost * (ebayCostPercent / costPercent);
            let netProfit = ebayCost * (netPercent / ebayCostPercent);
      
            startPrice = (cost + ebayCost + netProfit).toFixed(2);
      
            const {
              ebayCommissionPercent,
              minimumProfitPercent
            } = store.analyzerConfig;
      
            if (startPrice > competitorPrice) {
              ebayCost = cost * (ebayCommissionPercent / costPercent);
              netProfit = ebayCost * (minimumProfitPercent / ebayCommissionPercent);
      
              startPrice = (cost + ebayCost + netProfit).toFixed(2);
            }
      
            competitorInfo.cost = cost.toFixed(2);
            competitorInfo.ebayCost = ebayCost.toFixed(2);
            competitorInfo.net = netProfit.toFixed(2);
          }
      
          const quantitySetup = store.sourcingSetup.quantitySetup
            .find((supplier) => supplier.supplierId.toString() === supplierId.toString());
      
          const quantity = CalculateQuantity(inventoryQuantity, startPrice, quantitySetup);
      
          if (!errorRecord.errorSwitch && store.storeMarketplace === "ebay") {
            await this.ebayUpdateSyncedListing(
                true,
                errorRecord,
                listing,
                startPrice,
                quantity,
                title
            );
          } 
        //   else if (!errorRecord.errorSwitch && store.storeMarketplace === "amazon") {
        //     await amazonUpdateSyncedListing(
        //       decryptedToken,
        //       true,
        //       errorRecord,
        //       listing,
        //       {
        //         sellerId: store.marketplaceOptions.sellerId,
        //         marketplaceId: store.marketplaceOptions.marketplaceId,
        //         issueLocale: store.marketplaceOptions.issueLocale
        //       },
        //       startPrice,
        //       quantity,
        //       store.marketplaceOptions.optimalPricingWindow
        //     );
        //   }
      
          if (errorRecord.errorSwitch && errorRecord.majorError) {
            return { error: errorRecord.error }
          };
      
          const listingSyncedInfo = {
            sku,
            startPrice,
            competitorInfo,
            title,
            quantity,
            shippingCost,
            suppliersPrices,
            priceMarkUp: storeMarkUp * 100
          };
      
          await this.updateDatabaseSyncedListing(
            true,
            false,
            listing,
            errorRecord.errorSwitch,
            listingSyncedInfo,
            inventoryItem,
            formula
          );
      
          return false;
        } catch (error) {
          console.error(`jobs => storeSyncing => func syncListing: ${listing.sku}:`, error.message);
          await this.listingModel.updateOne(
            { _id: listing._id },
            {
              $push: {
                errorLogs: {
                  id: "func syncListing",
                  message: error.message
                }
              }
            }
          );
        }
    };

    async reviseListing(
        decryptedToken, 
        store, 
        suppliers, 
        listing, 
        errorRecord
    ) {
        const title = listing.listingInfo.title;
        const quantity = listing.listingInfo.quantity;
        let startPrice = parseFloat(listing.listingInfo.startPrice.value);
      
        const supplierId = listing.supplierId;
      
        const supplierConfig = suppliers[`${supplierId}-config`];
        const shippingCost = listing.inventoryInfo.shippingCost;
      
        const storeMarkUp = store.supplierMarkUps.find(obj => obj.supplierId.toString() === supplierId.toString()).markUpPercent / 100;
      
        const inventoryPrices = { ...listing.inventoryInfo.prices };
      
        Object.keys(inventoryPrices).forEach(price => {
            inventoryPrices[price] = parseFloat(inventoryPrices[price]);
        });
      
        const calculator = PriceCalculatorSupplier.getCalculator(
            supplierConfig.supplier,
            storeMarkUp + 1,
            inventoryPrices,
            supplierConfig.priceFormulas,
            shippingCost
        );
        
        let sellingPrice = startPrice;
        let formula = listing.inventoryInfo.appliedFormula;
      
        // let { sellingPriceB, formulaB } = calculator.calculate();
      
      
        // if (!listing.listingInfo.startPrice.immutability) {
        //     let sellingPrice = sellingPriceB;
        //     let formula = formulaB;
        // }
      
        const calculatorNoMarkUp = PriceCalculatorSupplier.getCalculator(
            supplierConfig.supplier,
            1,
            inventoryPrices,
            supplierConfig.priceFormulas,
            shippingCost
        );
      
        let { price: supplierCost } = calculatorNoMarkUp.calculate();
      
        if (sellingPrice !== null) {
          startPrice = parseFloat(sellingPrice.toFixed(2));
        } else {
            await this.listingModel.updateOne(
                { _id: listing._id },
                { $push: { errorLogs: { id: 'selling price not avaliable', message: formula } } }
            );
        }
      
        const supplierPrices = {
            supplierId: supplierConfig._id,
            supplier: supplierConfig.supplierNonCamelCase,
            sellingPrice: typeof startPrice === "number"
                ? parseFloat(startPrice.toFixed(2))
                : parseFloat(startPrice),
            formula,
            shippingCost,
            inventoryPrices: listing.inventoryInfo.prices,
            net: parseFloat((((startPrice - supplierCost) - (startPrice * 0.12))).toFixed(2)),
            supplierCost: parseFloat(supplierCost.toFixed(2)),
            totalCost: parseFloat((supplierCost + (startPrice * 0.12)).toFixed(2)),
            ebayCost: parseFloat((startPrice * 0.12).toFixed(2)),
            priceMarkUp: storeMarkUp * 100,

            // modification
            netPercent: 0,
            supplierCostPercent: 0,
            totalCostPercent: 0,
            ebayCostPercent: 0
        };
      
        supplierPrices.netPercent = parseFloat(((supplierPrices.net / supplierPrices.sellingPrice) * 100).toFixed(2));
        supplierPrices.supplierCostPercent = parseFloat(((supplierPrices.supplierCost / supplierPrices.sellingPrice) * 100).toFixed(2));
        supplierPrices.totalCostPercent = parseFloat(((supplierPrices.totalCost / supplierPrices.sellingPrice) * 100).toFixed(2));
        supplierPrices.ebayCostPercent = parseFloat(((supplierPrices.ebayCost / supplierPrices.sellingPrice) * 100).toFixed(2));
      
      
        const suppliersPrices = listing.suppliersPrices.map(obj => {
            if (obj.supplier === supplierPrices.supplier) {
                return supplierPrices;
            }
        
            return obj;
        });
      
        if (!errorRecord.errorSwitch && store.storeMarketplace === "ebay") {
            await this.ebayUpdateSyncedListing(
                true,
                errorRecord,
                listing,
                startPrice,
                quantity,
                title
            );
        } 
        
        // else if (!errorRecord.errorSwitch && store.storeMarketplace === "amazon") {
        //   await amazonUpdateSyncedListing(
        //     decryptedToken,
        //     true,
        //     errorRecord,
        //     listing,
        //     {
        //       sellerId: store.marketplaceOptions.sellerId,
        //       marketplaceId: store.marketplaceOptions.marketplaceId,
        //       issueLocale: store.marketplaceOptions.issueLocale
        //     },
        //     startPrice,
        //     quantity,
        //     store.marketplaceOptions.optimalPricingWindow
        //   );
        // }
      
        await this.updateDatabaseSyncedListing(
            true,
            true,
            listing,
            errorRecord.errorSwitch,
            {
                startPrice,
                suppliersPrices,
                priceMarkUp: storeMarkUp * 100
            },
            null,
            formula
        );
    };
      
    async getSuppliersPrices(store, suppliers, inventoryItems, listing) {
        const suppliersPrices = [];
      
        for (const supplierItem of inventoryItems) {
          const supplierId = supplierItem.supplierId;
      
          const supplierConfig = suppliers[`${supplierId}-config`];
          const shippingInfo = suppliers[`${supplierId}-shipping`];
          const shippingCost = await CalculateShippingCost(shippingInfo, supplierItem, listing.sku);
      
          const storeMarkUp = store.supplierMarkUps.find(obj => obj.supplierId.toString() === supplierId.toString()).markUpPercent / 100;
      
          const calculator = PriceCalculatorSupplier.getCalculator(
            supplierConfig.supplier,
            (storeMarkUp) + 1,
            supplierItem.prices,
            supplierConfig.priceFormulas,
            shippingCost
          );
      
          let { price: sellingPrice, formula } = calculator.calculate();
      
          const calculatorNoMarkUp = PriceCalculatorSupplier.getCalculator(
            supplierConfig.supplier,
            1,
            supplierItem.prices,
            supplierConfig.priceFormulas,
            shippingCost
          );
      
          let { price: supplierCost } = calculatorNoMarkUp.calculate();
      
          if (sellingPrice !== null) {
            const supplierPrices = {
              supplierId: supplierConfig._id,
              supplier: supplierConfig.supplierNonCamelCase,
              sellingPrice: parseFloat(sellingPrice.toFixed(2)),
              formula,
              shippingCost,
              inventoryPrices: supplierItem.prices,
              net: parseFloat((((sellingPrice - supplierCost) - (sellingPrice * 0.12))).toFixed(2)),
              supplierCost: parseFloat(supplierCost.toFixed(2)),
              totalCost: parseFloat((supplierCost + (sellingPrice * 0.12)).toFixed(2)),
              ebayCost: parseFloat((sellingPrice * 0.12).toFixed(2)),
              priceMarkUp: storeMarkUp * 100,

              // modification
              netPercent: 0,
              supplierCostPercent: 0,
              totalCostPercent: 0,
              ebayCostPercent: 0
            };
      
            supplierPrices.netPercent = parseFloat(((supplierPrices.net / supplierPrices.sellingPrice) * 100).toFixed(2));
            supplierPrices.supplierCostPercent = parseFloat(((supplierPrices.supplierCost / supplierPrices.sellingPrice) * 100).toFixed(2));
            supplierPrices.totalCostPercent = parseFloat(((supplierPrices.totalCost / supplierPrices.sellingPrice) * 100).toFixed(2));
            supplierPrices.ebayCostPercent = parseFloat(((supplierPrices.ebayCost / supplierPrices.sellingPrice) * 100).toFixed(2));
      
            suppliersPrices.push(supplierPrices);
          }
        }
      
        return suppliersPrices;
    }

    async ebayUpdateSyncedListing(
            itemAvailable: boolean,
            errorRecord: any,
            listing: Listing,
            listingPrice: number,
            listingQuantity: number,
            listingTitle: string,
        ): Promise<void> {
        try {
            const marketplace = await this.marketplaceModel.findOne({ storeMarketplace: 'ebay' }).exec();
            if (!marketplace) throw new NotFoundException(`Invalid marketplace!`);

            const decryptedToken = marketplace.apiOAuthToken;

            let request: any = {
                ReviseItemRequest: {
                    "@xmlns": "urn:ebay:apis:eBLBaseComponents",
                    RequesterCredentials: {
                        eBayAuthToken: decryptedToken,
                    },
                    ErrorLanguage: "en_US",
                    WarningLevel: "High",
                    Item: {
                        ItemID: listing.itemId,
                        Quantity: 0,
                    },
                },
            };
        
            if (itemAvailable) {
                request = {
                    ReviseItemRequest: {
                        "@xmlns": "urn:ebay:apis:eBLBaseComponents",
                        RequesterCredentials: {
                        eBayAuthToken: decryptedToken,
                        },
                        ErrorLanguage: "en_US",
                        WarningLevel: "High",
                        Item: {
                        ItemID: listing.itemId,
                        SKU: listing.sku,
                        Title: listingTitle,
                        StartPrice: {
                            "@currencyID": "USD",
                            "#text": listingPrice.toString(),
                        },
                        Quantity: listingQuantity,
                        },
                    },
                };
            }
        
            const xmlData = xmlbuilder.create(request).end({ pretty: true });
        
            // Set the headers for the eBay API call
            const headers = {
                "X-EBAY-API-SITEID": 0,
                "X-EBAY-API-COMPATIBILITY-LEVEL": 967,
                "X-EBAY-API-CALL-NAME": "ReviseItem",
                "X-EBAY-API-IAF-TOKEN": decryptedToken,
                "Content-type": "text/xml",
            };
        
            // Make the eBay API call to revise the item
            const response = await firstValueFrom(
                this.httpService.post("https://api.ebay.com/ws/api.dll", xmlData, { headers }),
            );
        
            const jsonData = await parseStringPromise(response.data, { explicitArray: false });
        
            if (jsonData.ReviseItemResponse.Ack === "Failure") {
                const errors = jsonData.ReviseItemResponse.Errors;
                return this.handleEbayApiErrors(errors, listing._id, errorRecord);
            } else {
                // If successful, remove any previous eBay API errors from the listing document
                await this.listingModel.updateOne({ _id: listing._id }, { $pull: { errorLogs: { id: "ebayApi" } } });
            }
        
            // Indicate no error occurred
            errorRecord.errorSwitch = false;
            errorRecord.majorError = false;
        } catch (error) {
          console.log(`modules => ebay => func ebayUpdateSyncedListing: itemId=${listing.itemId}:`, error);
          // Indicate an error occurred
          errorRecord.errorSwitch = true;
          errorRecord.majorError = false;
        }
    }
    
    async updateDatabaseSyncedListing(
        itemAvailable, 
        revise, 
        listing, 
        errorSwitch, 
        listingChanges, 
        inventoryItem, 
        priceFormula
    ) {
        let updateQuery = null;

        updateQuery = {
            "listingInfo.quantity": 0,
            // "ebayInfo.soldQuantity": listingChanges.soldQuantity,
            sku: listing.sku,
            synced: !errorSwitch,
            updateType: 'sync'
        };
      
        if (revise) {
            updateQuery = {
                "listingInfo.startPrice.value": listingChanges.startPrice,
                suppliersPrices: listingChanges.suppliersPrices,
                priceMarkUp: listingChanges.priceMarkUp,
                synced: !errorSwitch,
                updateType: 'sync'
            };
        } else if (itemAvailable) {
            updateQuery = {
                "listingInfo.startPrice.value": listingChanges.startPrice,
                "listingInfo.quantity": listingChanges.quantity,
                "listingInfo.title": listingChanges.title,
                // "ebayInfo.soldQuantity": listingChanges.soldQuantity,
                inventoryInfo: {
                prices: inventoryItem.prices,
                weightLb: inventoryItem.weightLb || 0,
                description: inventoryItem.description,
                quantity: inventoryItem.quantity,
                oem: inventoryItem.oem,
                partslink: inventoryItem.partslink,
                itemNumber: inventoryItem.itemNumber,
                appliedFormula: priceFormula,
                shippingCost: listingChanges.shippingCost
                },
                suppliersPrices: listingChanges.suppliersPrices,
                priceMarkUp: listingChanges.priceMarkUp,
                supplierId: inventoryItem.supplierId,
                sku: listing.sku,
                synced: !errorSwitch,
                updateType: 'sync'
            };
        
            if (listingChanges?.competitorInfo) {
                updateQuery.competitorInfo = listingChanges.competitorInfo;
            }
        };
        await this.listingModel.findByIdAndUpdate(listing._id, updateQuery);
    };
    
    private async handleEbayApiErrors(errorsArr: any, listingId: string, errorRecord: any): Promise<any> {
        const errorCodes = [
          "518", // call limit
          "931", "932", // Oauth token
          "21919188", // listing limit exceed
        ];
    
        const errors = Array.isArray(errorsArr) ? errorsArr : [errorsArr];
    
        try {
          for (const error of errors) {
            if (error.SeverityCode !== "Error") {
              continue;
            }
    
            if (errorCodes.includes(error.ErrorCode)) {
              errorRecord.errorSwitch = true;
              errorRecord.majorError = true;
              errorRecord.error = `${error.ErrorCode}: ${error.LongMessage}`;
              return;
            } else {
              await this.listingModel.updateOne(
                { _id: listingId },
                {
                  $push: {
                    errorLogs: {
                      id: "ebayApi",
                      message: `${error.ErrorCode}: ${error.LongMessage}`,
                    },
                  },
                },
              );
              return { errorSwitch: true, majorError: false };
            }
          }
        } catch (error) {
          console.log('modules => ebay => func handleEbayApiErrors:', error);
        }
    }
}
