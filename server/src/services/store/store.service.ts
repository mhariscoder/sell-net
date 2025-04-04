import { Injectable, NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import { Store } from './schemas/store.schema';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class StoreService {
    constructor(
        @InjectModel(Store.name, 'DATABASE_CONNECTION') private readonly storeModel: Model<Store>
    ) {}

    async createStore(store: Store): Promise<Store> {
        const newStore = new this.storeModel(store);
        return newStore.save();
    }

    async getAllStores(): Promise<Store[]> {
        return this.storeModel.find().exec();
    }

    async getStoreById(id: string): Promise<Store> {
        const store = await this.storeModel.findById(id).exec();
        if (!store) {
            throw new NotFoundException(`Store with ID ${id} not found`);
        }
        return store;
    }

    async updateStore(id: string, store: Store): Promise<Store> {
        const existingStore = await this.storeModel.findById(id).exec();
        if (!existingStore) {
            throw new NotFoundException(`Store with ID ${id} not found`);
        }

        console.log('store.storePassword', store.storePassword.length)

        if (store.storePassword === undefined || store.storePassword.length === 0) {
            delete store.storePassword;
        }
    
        const updatedStore = await this.storeModel.findByIdAndUpdate(id, store, { new: true }).exec();
    
        return updatedStore;
    }

    async deleteStore(id: string): Promise<any> {
        const result = await this.storeModel.findByIdAndDelete(id).exec();
        if (!result) {
            throw new NotFoundException(`Store with ID ${id} not found`);
        }
        return { message: `Store with ID ${id} successfully deleted` };
    }

    async importData(csvData: any[]) {
        if (!csvData || csvData.length === 0) {
            throw new Error('CSV data is empty');
        }
    
        const itemIds = [];
    
        await csvData.forEach(async (row) => {
            await itemIds.push(row['Item number']);
        });
    
        const storeDocument = {
            storeMarketplace: 'ebay',
            storeName: 'Hardcoded Store Name',
            storeUsername: 'default_username',
            storeEmail: 'default@store.com',
            storePassword: 'defaultPassword123',
            supplierIds: [],
            supplierMarkUps: [],
            syncSwitch: true,
            storeRedirectUri: '',
            fetch: {
                switch: true,
                specifiedItemIds: true,
                itemIds: itemIds,
            },
            apiOAuthToken: {
                accessToken: null,
                accessTokenUpdatedDate: null,
                applicationAccessToken: null,
                applicationAccessTokenUpdatedDate: null,
                refreshToken: null,
                refreshTokenValid: false,
                refreshTokenUpdatedDate: null,
                source: 'manual',
            },
            sourcingSetup: {
                supplierSourcingPriority: [],
                supplierTolerance: [],
                quantitySetup: [],
            },
            marketplaceOptions: {
                optimalPricingWindow: {
                    minimumSellerAllowedPricePercent: null,
                    maximumSellerAllowedPricePercent: null,
                },
                sellerId: 'someSellerId',
                marketplaceId: 'someMarketplaceId',
                issueLocale: 'US',
            },
            analyzerConfig: {
                ebayCommissionPercent: 10,
                minimumProfitPercent: 5,
            },
            listingDescriptionTemplate: false,
        };
    
        await this.storeModel.create(storeDocument);
    }
    
}
