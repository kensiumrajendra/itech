import { getAcumaticaPrices, generatePriceText } from '../../tranzetta';

export default async function getCustomerSpecificPrice(sku, qty = 1) {
    if (!sku) return null;

    // Customer ID already set internally inside function
    const customerSpecificPrices = await getAcumaticaPrices([{ sku, qty }]);
    const priceValue = customerSpecificPrices[sku];
    const priceText = generatePriceText(customerSpecificPrices[sku]);

    return {
        ...(priceValue ?? {}),
        formatted: priceText,
    };
}
