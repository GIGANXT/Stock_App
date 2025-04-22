// Price data interface
export interface PriceData {
  price: number;
  change: number;
  changePercent: number;
}

// Static data for spot price
export const SPOT_PRICE_DATA: PriceData = {
  price: 659.0,
  change: 13.0,
  changePercent: 0.48
};

// Static data for 3-month price
// export const THREE_MONTH_PRICE_DATA: PriceData = {
//   price: 298.0,
//   change: -15.0,
//   changePercent: -0.55
// }; 