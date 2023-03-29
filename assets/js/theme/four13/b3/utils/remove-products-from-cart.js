import asyncStencilUtils from '../../common/async-stencil-utils';

/** This is to avoid messing up the prices */
async function removeProductsFromCart(cartItemsToRemove) {
    const [cart] = await asyncStencilUtils.api.cart.getCart();

    if (!cart) return;

    const skusToRemove = cartItemsToRemove.reduce((a, v) => (v.sku ? { ...a, [v.sku]: 1 } : a), {});
    const productIdsToRemove = cartItemsToRemove.reduce((a, v) => (v.productId ? { ...a, [v.productId]: 1 } : a), {});
    const currentCartItems = [...cart.lineItems.physicalItems, ...cart.lineItems.digitalItems];

    for (const item of currentCartItems) {
        const shouldRemoveProduct = item.sku in skusToRemove || item.productId in productIdsToRemove;

        if (shouldRemoveProduct) {
            // eslint-disable-next-line no-await-in-loop
            await asyncStencilUtils.api.cart.itemRemove(item.id);
        }
    }
}

export default removeProductsFromCart;
