// Currency data by country code (ISO 4217)
export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  rate: number; // Exchange rate from USD (approximate)
}

export const countryCurrencies: Record<string, CurrencyInfo> = {
  // CFA Franc BCEAO (West Africa)
  BJ: { code: "XOF", symbol: "FCFA", name: "Franc CFA", rate: 600 },
  BF: { code: "XOF", symbol: "FCFA", name: "Franc CFA", rate: 600 },
  CI: { code: "XOF", symbol: "FCFA", name: "Franc CFA", rate: 600 },
  GW: { code: "XOF", symbol: "FCFA", name: "Franc CFA", rate: 600 },
  ML: { code: "XOF", symbol: "FCFA", name: "Franc CFA", rate: 600 },
  NE: { code: "XOF", symbol: "FCFA", name: "Franc CFA", rate: 600 },
  SN: { code: "XOF", symbol: "FCFA", name: "Franc CFA", rate: 600 },
  TG: { code: "XOF", symbol: "FCFA", name: "Franc CFA", rate: 600 },
  
  // CFA Franc BEAC (Central Africa)
  CM: { code: "XAF", symbol: "FCFA", name: "Franc CFA", rate: 600 },
  CF: { code: "XAF", symbol: "FCFA", name: "Franc CFA", rate: 600 },
  TD: { code: "XAF", symbol: "FCFA", name: "Franc CFA", rate: 600 },
  CG: { code: "XAF", symbol: "FCFA", name: "Franc CFA", rate: 600 },
  GQ: { code: "XAF", symbol: "FCFA", name: "Franc CFA", rate: 600 },
  GA: { code: "XAF", symbol: "FCFA", name: "Franc CFA", rate: 600 },
  
  // Other African currencies
  NG: { code: "NGN", symbol: "₦", name: "Naira", rate: 1500 },
  GH: { code: "GHS", symbol: "GH₵", name: "Cedi", rate: 14 },
  KE: { code: "KES", symbol: "KSh", name: "Shilling kenyan", rate: 155 },
  TZ: { code: "TZS", symbol: "TSh", name: "Shilling tanzanien", rate: 2500 },
  UG: { code: "UGX", symbol: "USh", name: "Shilling ougandais", rate: 3700 },
  RW: { code: "RWF", symbol: "FRw", name: "Franc rwandais", rate: 1250 },
  ZA: { code: "ZAR", symbol: "R", name: "Rand", rate: 18 },
  EG: { code: "EGP", symbol: "E£", name: "Livre égyptienne", rate: 48 },
  MA: { code: "MAD", symbol: "DH", name: "Dirham", rate: 10 },
  TN: { code: "TND", symbol: "DT", name: "Dinar tunisien", rate: 3.1 },
  DZ: { code: "DZD", symbol: "DA", name: "Dinar algérien", rate: 135 },
  CD: { code: "CDF", symbol: "FC", name: "Franc congolais", rate: 2700 },
  AO: { code: "AOA", symbol: "Kz", name: "Kwanza", rate: 830 },
  MZ: { code: "MZN", symbol: "MT", name: "Metical", rate: 64 },
  ZM: { code: "ZMW", symbol: "ZK", name: "Kwacha", rate: 26 },
  ZW: { code: "ZWL", symbol: "Z$", name: "Dollar zimbabwéen", rate: 320 },
  MG: { code: "MGA", symbol: "Ar", name: "Ariary", rate: 4500 },
  MU: { code: "MUR", symbol: "Rs", name: "Roupie mauricienne", rate: 45 },
  ET: { code: "ETB", symbol: "Br", name: "Birr éthiopien", rate: 57 },
  SD: { code: "SDG", symbol: "£", name: "Livre soudanaise", rate: 600 },
  LY: { code: "LYD", symbol: "LD", name: "Dinar libyen", rate: 4.8 },
  
  // European currencies
  FR: { code: "EUR", symbol: "€", name: "Euro", rate: 0.92 },
  DE: { code: "EUR", symbol: "€", name: "Euro", rate: 0.92 },
  IT: { code: "EUR", symbol: "€", name: "Euro", rate: 0.92 },
  ES: { code: "EUR", symbol: "€", name: "Euro", rate: 0.92 },
  PT: { code: "EUR", symbol: "€", name: "Euro", rate: 0.92 },
  BE: { code: "EUR", symbol: "€", name: "Euro", rate: 0.92 },
  NL: { code: "EUR", symbol: "€", name: "Euro", rate: 0.92 },
  AT: { code: "EUR", symbol: "€", name: "Euro", rate: 0.92 },
  IE: { code: "EUR", symbol: "€", name: "Euro", rate: 0.92 },
  FI: { code: "EUR", symbol: "€", name: "Euro", rate: 0.92 },
  GR: { code: "EUR", symbol: "€", name: "Euro", rate: 0.92 },
  LU: { code: "EUR", symbol: "€", name: "Euro", rate: 0.92 },
  MC: { code: "EUR", symbol: "€", name: "Euro", rate: 0.92 },
  AD: { code: "EUR", symbol: "€", name: "Euro", rate: 0.92 },
  MT: { code: "EUR", symbol: "€", name: "Euro", rate: 0.92 },
  CY: { code: "EUR", symbol: "€", name: "Euro", rate: 0.92 },
  EE: { code: "EUR", symbol: "€", name: "Euro", rate: 0.92 },
  LV: { code: "EUR", symbol: "€", name: "Euro", rate: 0.92 },
  LT: { code: "EUR", symbol: "€", name: "Euro", rate: 0.92 },
  SK: { code: "EUR", symbol: "€", name: "Euro", rate: 0.92 },
  SI: { code: "EUR", symbol: "€", name: "Euro", rate: 0.92 },
  GB: { code: "GBP", symbol: "£", name: "Livre sterling", rate: 0.79 },
  CH: { code: "CHF", symbol: "CHF", name: "Franc suisse", rate: 0.88 },
  NO: { code: "NOK", symbol: "kr", name: "Couronne norvégienne", rate: 10.8 },
  SE: { code: "SEK", symbol: "kr", name: "Couronne suédoise", rate: 10.5 },
  DK: { code: "DKK", symbol: "kr", name: "Couronne danoise", rate: 6.9 },
  PL: { code: "PLN", symbol: "zł", name: "Zloty", rate: 4 },
  CZ: { code: "CZK", symbol: "Kč", name: "Couronne tchèque", rate: 23 },
  HU: { code: "HUF", symbol: "Ft", name: "Forint", rate: 360 },
  RO: { code: "RON", symbol: "lei", name: "Leu", rate: 4.6 },
  BG: { code: "BGN", symbol: "лв", name: "Lev", rate: 1.8 },
  HR: { code: "EUR", symbol: "€", name: "Euro", rate: 0.92 },
  RU: { code: "RUB", symbol: "₽", name: "Rouble", rate: 92 },
  UA: { code: "UAH", symbol: "₴", name: "Hryvnia", rate: 41 },
  TR: { code: "TRY", symbol: "₺", name: "Livre turque", rate: 32 },
  
  // Americas
  US: { code: "USD", symbol: "$", name: "Dollar", rate: 1 },
  CA: { code: "CAD", symbol: "C$", name: "Dollar canadien", rate: 1.36 },
  MX: { code: "MXN", symbol: "$", name: "Peso mexicain", rate: 17 },
  BR: { code: "BRL", symbol: "R$", name: "Real", rate: 5 },
  AR: { code: "ARS", symbol: "$", name: "Peso argentin", rate: 870 },
  CL: { code: "CLP", symbol: "$", name: "Peso chilien", rate: 950 },
  CO: { code: "COP", symbol: "$", name: "Peso colombien", rate: 4000 },
  PE: { code: "PEN", symbol: "S/", name: "Sol", rate: 3.7 },
  VE: { code: "VES", symbol: "Bs", name: "Bolivar", rate: 36 },
  EC: { code: "USD", symbol: "$", name: "Dollar", rate: 1 },
  BO: { code: "BOB", symbol: "Bs", name: "Boliviano", rate: 6.9 },
  PY: { code: "PYG", symbol: "₲", name: "Guarani", rate: 7300 },
  UY: { code: "UYU", symbol: "$", name: "Peso uruguayen", rate: 39 },
  HT: { code: "HTG", symbol: "G", name: "Gourde", rate: 132 },
  JM: { code: "JMD", symbol: "J$", name: "Dollar jamaïcain", rate: 156 },
  
  // Asia & Middle East
  CN: { code: "CNY", symbol: "¥", name: "Yuan", rate: 7.2 },
  JP: { code: "JPY", symbol: "¥", name: "Yen", rate: 150 },
  KR: { code: "KRW", symbol: "₩", name: "Won", rate: 1330 },
  IN: { code: "INR", symbol: "₹", name: "Roupie indienne", rate: 83 },
  PK: { code: "PKR", symbol: "Rs", name: "Roupie pakistanaise", rate: 280 },
  BD: { code: "BDT", symbol: "৳", name: "Taka", rate: 110 },
  ID: { code: "IDR", symbol: "Rp", name: "Roupie indonésienne", rate: 15700 },
  MY: { code: "MYR", symbol: "RM", name: "Ringgit", rate: 4.7 },
  TH: { code: "THB", symbol: "฿", name: "Baht", rate: 36 },
  VN: { code: "VND", symbol: "₫", name: "Dong", rate: 24500 },
  PH: { code: "PHP", symbol: "₱", name: "Peso philippin", rate: 56 },
  SG: { code: "SGD", symbol: "S$", name: "Dollar singapourien", rate: 1.35 },
  TW: { code: "TWD", symbol: "NT$", name: "Dollar taïwanais", rate: 32 },
  AE: { code: "AED", symbol: "د.إ", name: "Dirham", rate: 3.67 },
  SA: { code: "SAR", symbol: "﷼", name: "Riyal saoudien", rate: 3.75 },
  QA: { code: "QAR", symbol: "﷼", name: "Riyal qatari", rate: 3.64 },
  KW: { code: "KWD", symbol: "د.ك", name: "Dinar koweïtien", rate: 0.31 },
  BH: { code: "BHD", symbol: "BD", name: "Dinar bahreïni", rate: 0.38 },
  OM: { code: "OMR", symbol: "ر.ع.", name: "Rial omanais", rate: 0.38 },
  IL: { code: "ILS", symbol: "₪", name: "Shekel", rate: 3.7 },
  LB: { code: "LBP", symbol: "ل.ل", name: "Livre libanaise", rate: 89500 },
  JO: { code: "JOD", symbol: "JD", name: "Dinar jordanien", rate: 0.71 },
  IQ: { code: "IQD", symbol: "ع.د", name: "Dinar irakien", rate: 1310 },
  IR: { code: "IRR", symbol: "﷼", name: "Rial iranien", rate: 42000 },
  
  // Oceania
  AU: { code: "AUD", symbol: "A$", name: "Dollar australien", rate: 1.54 },
  NZ: { code: "NZD", symbol: "NZ$", name: "Dollar néo-zélandais", rate: 1.65 },
};

// Default currency (USD)
export const defaultCurrency: CurrencyInfo = {
  code: "USD",
  symbol: "$",
  name: "Dollar",
  rate: 1,
};

// Get currency info by country code
export const getCurrencyByCountry = (countryCode: string): CurrencyInfo => {
  return countryCurrencies[countryCode] || defaultCurrency;
};

// Format price in local currency
export const formatPrice = (
  priceInUSD: number,
  countryCode: string,
  showDecimals: boolean = true
): string => {
  const currency = getCurrencyByCountry(countryCode);
  const localPrice = priceInUSD * currency.rate;
  
  // Round to nice numbers based on currency rate
  let displayPrice: number;
  if (currency.rate >= 1000) {
    // For very weak currencies, round to nearest 100 or 1000
    displayPrice = Math.round(localPrice / 100) * 100;
  } else if (currency.rate >= 100) {
    // For weak currencies, round to nearest 10
    displayPrice = Math.round(localPrice / 10) * 10;
  } else if (currency.rate >= 10) {
    // For moderate currencies, round to nearest whole number
    displayPrice = Math.round(localPrice);
  } else {
    // For strong currencies (USD, EUR, GBP), keep decimals
    displayPrice = Math.round(localPrice * 100) / 100;
  }
  
  // Format the number with appropriate separators
  const formatted = showDecimals && currency.rate < 10
    ? displayPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : displayPrice.toLocaleString('en-US', { maximumFractionDigits: 0 });
  
  // Position symbol based on currency conventions
  const symbolAfter = ['FCFA', 'DH', 'DA', 'DT', 'kr', 'zł', 'Kč', 'Ft', 'lei', 'лв'].includes(currency.symbol);
  
  return symbolAfter
    ? `${formatted} ${currency.symbol}`
    : `${currency.symbol}${formatted}`;
};
