import { toast } from "sonner";

/**
 * Currency and Exchange Rate utilities
 */

// Supported currencies
export const CURRENCIES = [
    { code: "JPY", name: "日本円", symbol: "¥" },
    { code: "USD", name: "米ドル", symbol: "$" },
    { code: "EUR", name: "ユーロ", symbol: "€" },
    { code: "GBP", name: "英ポンド", symbol: "£" },
    { code: "KRW", name: "韓国ウォン", symbol: "₩" },
    { code: "CNY", name: "中国元", symbol: "¥" },
    { code: "TWD", name: "台湾ドル", symbol: "NT$" },
    { code: "THB", name: "タイバーツ", symbol: "฿" },
    { code: "VND", name: "ベトナムドン", symbol: "₫" },
    { code: "SGD", name: "シンガポールドル", symbol: "S$" },
    { code: "AUD", name: "豪ドル", symbol: "A$" },
    { code: "CAD", name: "カナダドル", symbol: "C$" },
] as const;

export type CurrencyCode = typeof CURRENCIES[number]["code"];

const CACHE_KEY = "tripmate_exchange_rates";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in ms

interface CachedRates {
    timestamp: number;
    rates: Record<string, number>;
}

/**
 * Fetch exchange rates from free API with caching
 */
export async function fetchExchangeRates(baseCurrency: CurrencyCode = "JPY"): Promise<Record<string, number>> {
    // Try to load from cache
    if (typeof window !== "undefined") {
        try {
            const cached = localStorage.getItem(`${CACHE_KEY}_${baseCurrency}`);
            if (cached) {
                const { timestamp, rates }: CachedRates = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_TTL) {
                    console.log(`Using cached rates for ${baseCurrency}`);
                    return rates;
                }
            }
        } catch (e) {
            console.warn("Failed to read exchange rate cache", e);
        }
    }

    try {
        const response = await fetch(
            `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`
        );

        if (!response.ok) {
            throw new Error("為替レートの取得に失敗しました");
        }

        const data = await response.json();
        const rates = data.rates;

        // Save to cache
        if (typeof window !== "undefined") {
            try {
                const cacheData: CachedRates = {
                    timestamp: Date.now(),
                    rates,
                };
                localStorage.setItem(`${CACHE_KEY}_${baseCurrency}`, JSON.stringify(cacheData));
            } catch (e) {
                console.warn("Failed to save exchange rate cache", e);
            }
        }

        return rates;
    } catch (error) {
        console.error("Exchange rate fetch error:", error);

        // Fallback to cache even if expired if we're offline or API fails
        if (typeof window !== "undefined") {
            const cached = localStorage.getItem(`${CACHE_KEY}_${baseCurrency}`);
            if (cached) {
                const { rates }: CachedRates = JSON.parse(cached);
                toast.warning("最新レートの取得に失敗したため、キャッシュを使用します");
                return rates;
            }
        }

        throw error;
    }
}

/**
 * Convert amount to JPY
 */
export function convertToJPY(
    amount: number,
    fromCurrency: CurrencyCode,
    rates: Record<string, number>
): number {
    if (fromCurrency === "JPY") {
        return Math.round(amount);
    }

    // rates are based on JPY, so we need to invert
    const rate = rates[fromCurrency];
    if (!rate) {
        console.error(`Rate for ${fromCurrency} not found`);
        return amount;
    }

    // If base is JPY, rates[USD] = 0.0067 means 1 JPY = 0.0067 USD
    // So 1 USD = 1/0.0067 = ~149 JPY
    const jpyAmount = amount / rate;
    return Math.round(jpyAmount);
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(code: CurrencyCode): string {
    const currency = CURRENCIES.find(c => c.code === code);
    return currency?.symbol || code;
}

/**
 * Format amount with currency
 */
export function formatCurrency(amount: number, currencyCode: CurrencyCode): string {
    const symbol = getCurrencySymbol(currencyCode);
    const prefix = currencyCode === "JPY" ? "" : `${currencyCode} `;

    // Special formatting for currencies without decimals
    if (["JPY", "KRW", "VND"].includes(currencyCode)) {
        return `${prefix}${symbol}${Math.round(amount).toLocaleString()}`;
    }

    return `${prefix}${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
