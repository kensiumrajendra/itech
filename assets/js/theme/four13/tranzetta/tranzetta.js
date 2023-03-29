import 'regenerator-runtime/runtime';
import asyncStencilUtils from '../common/async-stencil-utils';
import gqlFetch from '../common/gql-fetch';
import swal from '../../global/sweet-alert';
import formatToUSD from '../common/format-to-usd';

// Initial state
const state = {
	acumaticaCustomerId: null,
	fetchedPrices: {},
};

const tranzettaAccessToken = 'P@ssw0rd';
const tranzettaClientName = 'ddp';
const tranzettaApiUrl = `https://tranzetta-v2-backend-dev.four13.co/api/tranzetta/${tranzettaClientName}`;

/**
 * Get prices from Acumatica
 * @param {array} products The array containing products data.
 *     Each item in the array must be in the form of `{ sku: 'SKU123', qty: 1 }`.
 */
export async function getAcumaticaPrices(products) {
	const customerId = state.acumaticaCustomerId;
    const headers = new Headers();

    headers.append('Content-Type', 'application/json');
    headers.append('Authorization', `Bearer ${tranzettaAccessToken}`);

    const response = await fetch(`${tranzettaApiUrl}/get-acumatica-prices2`, {
        headers,
        method: 'POST',
        body: JSON.stringify({
            customerId,
            products,
        }),
    });

    const prices = await response.json();

    return prices;
}

function setPriceText(priceElement, price) {
    const priceText = generatePriceText(price)

    priceElement.textContent = priceText;
}

export function generatePriceText(price) {
    const priceNotFound = !price;
    const hasPriceRange = 'priceRange' in (price ?? {})
    let text;

    if (priceNotFound) {
        text = 'Call for Price';
    } else {
        const acumaticaPrice = price.value;
        const formattedPrice = formatToUSD(acumaticaPrice);

        if (hasPriceRange) {
            const priceRange = price.priceRange;
            const formattedMin = formatToUSD(priceRange.min);
            const formattedMax = formatToUSD(priceRange.max);
    
            if (priceRange.min === priceRange.max) {
                text = formattedPrice;
            } else {
                text = `${formattedMin} - ${formattedMax}`;
            }
        } else {
            text = formattedPrice;
        }
    }

    return text;
}

/**
 * Apply Acumatica price on the specified DOM context with the attribute `data-product-price-id` with a qty of 1.
 * @param {HTMLElement} options.context The element, which to apply Acumatica price with. Defaults to the `document` element.
 */
export async function applyAcumaticaPriceToElements(options = {}) {
    const { context = document } = options;

    const priceElements = Array.from(context.querySelectorAll('[data-product-custom-price]'));
    const priceElementsKeyBySku = priceElements.reduce((result, priceElement) => {
        const sku = priceElement.dataset.inventoryId;

        if (sku in result) {
            result[sku].push(priceElement);
            return result;
        }

        return {
            ...result,
            [sku]: [priceElement],
        };
    }, {});

    const skuList = Object.keys(priceElementsKeyBySku);
	const productsToFetch = skuList.map(sku => ({ sku, qty: 1 }));
    const fetchedPrices = await getAcumaticaPrices(productsToFetch);
    const skusWithPrice = Object.entries(fetchedPrices).reduce((result, [sku, price]) => {
        if (price.value !== null) {
            return {
                ...result,
                [sku]: price
            }
        } else {
            return result
        }
    }, {})

    state.fetchedPrices = {
		...state.fetchedPrices,
		...skusWithPrice,
	};

    for (const sku of skuList) {
        const skuNotFound = !(sku in state.fetchedPrices);
        const price = skuNotFound ? null : fetchedPrices[sku];

        for (const element of priceElementsKeyBySku[sku]) {
            setPriceText(element, price);
        }
    }
}

/**
 * Apply Acumatica price on the target price element.
 * @param {HTMLElement} priceElement The target custom price component price element.
 * @param {Number} qty The qty of the product to send along the request. Has a default of 1.
 * @returns {Boolean} Returns true if SKU has price, false otherwise.
 */
export async function applyAcumaticaPriceToElement(priceElement, qty = 1) {
	const sku = priceElement.dataset.inventoryId;
	const fetchedPrice = await getAcumaticaPrices([{ sku, qty }]);

    state.fetchedPrices = {
        ...state.fetchedPrices,
        ...fetchedPrice,
    }

    const skuHasPrice = state.fetchedPrices[sku].value !== null;
    const price = skuHasPrice ? fetchedPrice[sku] : null;
    const hasPrice = skuHasPrice;

	setPriceText(priceElement, price);

    return hasPrice;
}

/**
 * Get the customer ID of the customer from Acumatica.
 * @param {string|null} bcCustomerId The BigCommerce customer ID to use for retrieving the Acumatica customer ID.
 */
export async function getACCustomerIdFromBCCustomerGroupName(bcCustomerGroupName) {
    if (!bcCustomerGroupName) return null;

    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    headers.append('Authorization', `Bearer ${tranzettaAccessToken}`);

    const response = await fetch(`${tranzettaApiUrl}/convertBCCustomer?company=${encodeURIComponent(bcCustomerGroupName)}`, {
		headers,
	});

    const { customerId } = await response.json();

    return customerId;
}

/**
 * Remove line items in the cart with the specified product ID.
 * @param {string} sku The product ID of a product in BigCommerce
 */
export async function removeDuplicateCartProducts(sku) {
    if (!sku) {
        throw new Error('Product SKU is required.');
    }

    const [cart] = await asyncStencilUtils.api.cart.getCart();

    if (!cart) return;

    const allCartItems = [
        ...cart.lineItems.physicalItems,
        ...cart.lineItems.digitalItems,
    ]

    const removeDuplicatePromises = allCartItems.reduce(
        (promises, item) => {
            if (item.sku === sku) {
                return [...promises, asyncStencilUtils.api.cart.itemRemove(item.id)];
            }

            return promises;
        },
        [],
    );

    await Promise.all(removeDuplicatePromises);
}

/**
 * Sync cart item price with Acumatica.
 * @param {number|string} params.cartId The cart id.
 * @param {number|string} params.lineItemId The cart line item id.
 * @param {number|string} params.productId The product id in BigCommerce.
 * @param {string} params.sku The product SKU, to be used to search the product in Acumatica.
 * @param {number} params.qty The qty of the product, for calculating the price.
 */
export async function updateCartItemWithAcumaticaPrice(params = {}) {
    const { cartId, lineItemId, sku, productId, qty } = params;
	const customerId = state.acumaticaCustomerId;
    const headers = new Headers();

    headers.append('Content-Type', 'application/json');
    headers.append('Authorization', `Bearer ${tranzettaAccessToken}`);

	// const response = await fetch(`${tranzettaApiUrl}/updateBCCartWithACPrice`, {
	const response = await fetch(`${tranzettaApiUrl}/update-cart-price`, {
        headers,
        method: 'POST',
        body: JSON.stringify({
            products: [{ sku, qty }],
            cartId,
            productId,
            lineItemId,
            customerId,
        }),
    });

    if (!response.ok) {
        let message

        if (response.status >= 500) {
            message = 'Server error';
        } else if (response.status >= 400) {
            message = 'Client error';
        } else {
            message = 'Unexpected error';
        }

        return Promise.reject(message)
    }
}

/**
 * Override add to cart buttons click event. EXCEPT for the product detail page Add to Cart button.
 * @param {HTMLElement} options.context The DOM reference to apply the override. Defaults to the `document` element.
 */
export async function overrideAddToCartButtons(options = {}) {
    const { context = document } = options;

    const customAddToCartHandler = async (event) => {
        /* 1. Prevent default click event of <a> elements, which is redirecting to the defined href. */
        event.preventDefault();

        const button = event.target;
        const sku = button.dataset.customAddToCartSku;
        const skuNotFound = !(sku in state.fetchedPrices);

		/* 2. Stop if there is no price for the SKU. */
        if (skuNotFound) {
            return;
        }

        /* 3. Change button text to indicate loading state. */
        button.textContent = 'Adding to cart...';

        /* 4. Get search params from the href of the button and extract the productId. */
        const searchParams = new URLSearchParams(button.href);
        const productId = searchParams.get('product_id');

        /* 5. Compose form data from the extracted productId. */
        const formData = new FormData();
        formData.append('action', 'add');
        formData.append('product_id', productId);
        formData.append('qty[]', 1);

        /* 6. Remove line items from cart that are of the same product SKU. */
        await removeDuplicateCartProducts(sku);

        /* 7. Add product to cart manually and update cart item price, before going to the cart page. */
		const response = await asyncStencilUtils.api.cart.itemAdd(formData);
		const cartId = response.data.cart_id;
		const cartItem = response.data.cart_item;
		const redirectURL = `/cart.php?suggest=${cartItem.id}`;

		try {
			await updateCartItemWithAcumaticaPrice({
				cartId,
				lineItemId: cartItem.id,
				sku,
				productId: Number(productId),
				qty: 1,
			});

			window.location.href = redirectURL;
		} catch (err) {
			swal({
				text: 'Something went wrong while adding the product to your cart.',
				type: 'error',
			});

			// Remove cart line item from cart in case something went wrong.
			await asyncStencilUtils.api.cart.itemRemove(cartItem.id);
		}
    };

    // Select the product card add to cart buttons
    const addToCartButtons = context.querySelectorAll('[data-custom-add-to-cart]');

    // Apply the listener to all the selected links/buttons
    for (const button of Array.from(addToCartButtons)) {
        const sku = button.dataset.customAddToCartSku;

        button.addEventListener('click', customAddToCartHandler);

        if (sku in state.fetchedPrices) {
          button.removeAttribute('disabled');
          button.removeAttribute('style');
        }
    }
}

/**
 * Apply some overrides to the product details section in the product page.
 * @param {HTMLElement} options.context The DOM reference to apply the override.
 * Defaults to `document.querySelector('.productView')`.
 */
export async function overrideProductDetails(options = {}) {
	const {
        context = document.querySelector('.productView'),
        acumaticaCustomerId = state.acumaticaCustomerId,
    } = options;

    if (!context || !acumaticaCustomerId) return;

	/* If on product page, hide the qty increments and add to cart buttons */
	const priceElement = context.querySelector('[data-product-custom-price]');
	const sku = priceElement.dataset.inventoryId;

	if (sku in state.fetchedPrices)  {
		const elementsToShow = context.querySelectorAll([
			'.form-field--increments',
			'#form-action-addToCart',
		].join(','));

		for (const el of Array.from(elementsToShow)) {
			el.style.display = 'block';
		}
	}
}

/**
 * Temporary solution for BC bug of `null` SKUs in wishlist items.
 * It will just put an SKU to the elements in the wishlist page.
 * 
 * @param {string} storefrontApiToken The storefront API token to use in GraphQL requests.
 */
async function fixWishlistContentsPage(storefrontApiToken) {    
    const url = new URL(window.location.href);
    const isWishlistPage = url.pathname === '/wishlist.php';
    const isWishlistContentsPage = isWishlistPage && url.searchParams.get('action') === 'viewwistlistitems';
    const isInPublicWishlistPage = isWishlistPage && url.searchParams.get('publicwishlist') !== undefined;

    if (isWishlistContentsPage || isInPublicWishlistPage) {
        const priceElements = Array.from(document.querySelectorAll('[data-inventory-id=""]'));

        if (priceElements.length === 0) return;

        const productIdsToFix = priceElements.map(el => Number(el.dataset?.productIdForFixing));
        const productIdsWithSkus = await gqlFetch(`
            query getProductIdsWithSkus {
                site {
                    products(entityIds: ${JSON.stringify(productIdsToFix)}, first: 50) {
                        edges {
                            node {
                                entityId
                                sku
                            }
                        }
                    }
                }
            }
        `);

        const idToSkuMap = Object.fromEntries(
            productIdsWithSkus.data.site.products.map(({ entityId, sku }) => [entityId, sku])
        );

        for (const element of priceElements) {
            const productId = element.dataset.productIdForFixing;
            const sku = idToSkuMap[productId];

            element.dataset.inventoryId = sku;
        }
    }
}

/** Apply our listeners and overrides. To be run only once when the page is loaded. */
export async function initAcumaticaPrices(context) {
    const { customer } = context;
    const acumaticaCustomerId = await getACCustomerIdFromBCCustomerGroupName(customer?.customer_group_name);

    state.acumaticaCustomerId = acumaticaCustomerId;

    await fixWishlistContentsPage();
    await applyAcumaticaPriceToElements();

    overrideAddToCartButtons();
    overrideProductDetails();
}
