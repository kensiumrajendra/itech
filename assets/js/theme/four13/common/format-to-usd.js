const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
});

const formatToUSD = currencyFormatter.format;

export default formatToUSD;
