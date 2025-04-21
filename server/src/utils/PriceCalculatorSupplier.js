class PriceCalculator {
    constructor(margin, prices, priceFormulas, shippingCost) {
      this.margin = margin;
      this.prices = prices;
      this.priceFormulas = priceFormulas;
      this.shippingCost = shippingCost;
    }
  
    calculate() {
      throw new Error("calculate() must be implemented.");
    }
  }
  
  class ExpressPartsCalculator extends PriceCalculator {
    calculate() {
      if (!this.shippingCost)
        return { price: this.prices.net, formula: this.priceFormulas[3] }
      else if (this.prices.avgCost)
        return { price: (this.prices.avgCost + this.prices.lastAddedCost + this.shippingCost) * this.margin, formula: this.priceFormulas[2] };
      else if (this.prices.lastCost)
        return { price: (this.prices.lastCost + this.prices.lastAddedCost + this.shippingCost) * this.margin, formula: this.priceFormulas[1] };
      else if (this.prices.net)
        return { price: ((this.prices.net * 0.5) + this.prices.lastAddedCost + this.shippingCost) * this.margin, formula: this.priceFormulas[0] };
      return { price: null, formula: "Cost is missing for Express Parts" };
    }
  }
  
  class CarPartsCalculator extends PriceCalculator {
    calculate() {
      if (!this.prices.cost)
        return { price: null, formula: "Cost is missing for Car Parts" };
      return { price: (this.prices.cost + this.prices.shipping + this.prices.handlingCost + this.shippingCost) * this.margin, formula: this.priceFormulas[0] };
    }
  }
  
  class JcAutoCalculator extends PriceCalculator {
    calculate() {
      if (!this.prices.ec_price)
        return { price: null, formula: "EC Price is missing for JC Auto" };
      return { price: (this.prices.ec_price + this.shippingCost) * this.margin, formula: this.priceFormulas[0] };
    }
  }
  
  class JcAutoWholesaleCalculator extends PriceCalculator {
    calculate() {
      if (!this.prices.cost)
        return { price: null, formula: "cost price is missing for JC Auto Wholesale" };
      return { price: (this.prices.cost + this.shippingCost) * this.margin, formula: this.priceFormulas[0] };
    }
  }
  
  class leftoversCalculator extends PriceCalculator {
    calculate() {
      if (!this.prices.cost)
        return { price: null, formula: "cost price is missing for Leftovers" };
      return { price: (this.prices.cost + this.shippingCost) * this.margin, formula: this.priceFormulas[0] };
    }
  }
  
  class PriceCalculatorSupplier {
    static getCalculator(supplier, margin, prices, priceFormulas, shippingCost) {
      switch (supplier) {
        case "expressParts":
          return new ExpressPartsCalculator(margin, prices, priceFormulas, shippingCost);
        case "carparts":
          return new CarPartsCalculator(margin, prices, priceFormulas, shippingCost);
        case "jcAuto":
          return new JcAutoCalculator(margin, prices, priceFormulas, shippingCost);
        case "jcAutoWholesale":
          return new JcAutoWholesaleCalculator(margin, prices, priceFormulas, shippingCost);
        case "leftovers":
          return new leftoversCalculator(margin, prices, priceFormulas, shippingCost);
        default:
          throw new Error("Unsupported supplier");
      }
    }
  }
  
  module.exports = PriceCalculatorSupplier;