import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Marketplace } from './schemas/marketplace.schema';
import axios from 'axios';
import * as qs from 'qs';
import { decrypt } from 'src/helper';

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectModel(Marketplace.name, 'DATABASE_CONNECTION') private readonly marketplaceModel: Model<Marketplace>,
  ) {}

  async create(data: Marketplace): Promise<Marketplace> {
    const existingMarketplace = await this.marketplaceModel.findOne({ storeMarketplace: data.storeMarketplace }).exec();
    if (existingMarketplace) {
      throw new Error(`Marketplace with name ${data.storeMarketplace} already exists`);
    }

    const newMarketplace = new this.marketplaceModel(data);
    return newMarketplace.save();
  }

  async findAll(): Promise<Marketplace[]> {
    return this.marketplaceModel.find().exec();
  }

  async findOne(id: string): Promise<Marketplace> {
    const marketplace = await this.marketplaceModel.findById(id).exec();
    if (!marketplace) {
      throw new NotFoundException(`Marketplace with ID ${id} not found`);
    }
    return marketplace;
  }

  async update(id: string, data: Partial<Marketplace>): Promise<Marketplace> {
    const existingMarketplace = await this.marketplaceModel.findOne({ storeMarketplace: data.storeMarketplace, _id: { $ne: id } }).exec();
    if (existingMarketplace) {
      throw new Error(`Marketplace with name ${data.storeMarketplace} already exists`);
    }

    const updatedMarketplace = await this.marketplaceModel.findByIdAndUpdate(id, data, {
      new: true,
    });
    if (!updatedMarketplace) {
      throw new NotFoundException(`Marketplace with ID ${id} not found`);
    }
    return updatedMarketplace;
  }

  async delete(id: string): Promise<{ message: string }> {
    const result = await this.marketplaceModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException(`Marketplace with ID ${id} not found`);
    }
    return { message: 'Marketplace deleted successfully' };
  }

  async generateToken(id: string): Promise<any> {
    try {
      let url = '';
      let headers = {};
      let body = {};

      // Fetch marketplace by ID
      const marketplace = await this.marketplaceModel.findById(id).exec();
      if (!marketplace) {
        throw new NotFoundException(`Marketplace with ID ${id} not found`);
      }

      // Fetch marketplace credentials
      const marketplaceData = await this.getMarketplaceCredentials(marketplace.storeMarketplace);

      headers = {
        'Authorization': `Basic ${Buffer.from(`${marketplaceData.clientId}:${marketplaceData.clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      };

      // For Amazon
      if (marketplace.storeMarketplace === 'amazon') {
        url = 'https://api.amazon.com/auth/o2/token';
        
        body = qs.stringify({
          grant_type: "client_credentials",
          scope: "appstore::apps:readwrite",
          client_id: `${marketplaceData.clientId}`,
          client_secret: `${marketplaceData.clientSecret}`,
        });
      }

      // For eBay
      if (marketplace.storeMarketplace === 'ebay') {
        url = 'https://api.ebay.com/identity/v1/oauth2/token';
        
        body = qs.stringify({
          grant_type: marketplace.grant_type,
          scope: marketplace.scope,
          redirect_uri: marketplaceData.redirectUri,
          client_id: `${marketplaceData.clientId}`,
          client_secret: `${marketplaceData.clientSecret}`,
        });
      }

      // Send POST request to fetch the token
      const response = await axios.post(url, body, { headers });
      
      // Log the response for debugging
      console.debug(`Response from ${marketplace.storeMarketplace}:`, response.data);

      const { access_token } = response.data;

      if (!access_token) {
        throw new NotFoundException('Access token not found');
      }

      return { access_token };
      
    } catch (error) {
      console.error('Error generating token:', error.message);

      // If the error is from axios and contains a response, log more details
      if (error.response) {
        console.error('Axios error response:', error.response.data);
        throw new NotFoundException(`${error.response.data.error_description || error.message}`);
      }

      // If it's a generic error without response, log the error message
      throw new NotFoundException(`Error: ${error.message}`);
    }
  }
  
  async getMarketplaceCredentials(storeMarketplace: string) {
    const marketplaceData = await this.marketplaceModel.findOne({ storeMarketplace }).exec();
    if (!marketplaceData) {
      throw new Error(`Marketplace credentials not found for ${storeMarketplace}`);
    }
    return marketplaceData;
  }
}