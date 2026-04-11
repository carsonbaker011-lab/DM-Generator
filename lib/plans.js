export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    monthlyGenerations: 3,
    maxUrls: 0,
    webSearch: false,
    emailSend: false,
  },
  silver: {
    name: 'Silver',
    price: 19,
    monthlyGenerations: 50,
    maxUrls: 1,
    webSearch: true,
    emailSend: true,
  },
  gold: {
    name: 'Gold',
    price: 39,
    monthlyGenerations: Infinity,
    maxUrls: 4,
    webSearch: true,
    emailSend: true,
  },
};

export const STRIPE_PRICES = {
  silver: process.env.STRIPE_SILVER_PRICE_ID,
  gold: process.env.STRIPE_GOLD_PRICE_ID,
};
