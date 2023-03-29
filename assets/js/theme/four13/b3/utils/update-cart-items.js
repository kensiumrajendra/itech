import { updateCartItemWithAcumaticaPrice } from '../../tranzetta';
import asyncStencilUtils from '../../common/async-stencil-utils';
import swal from '../../../global/sweet-alert';
import removeProductsFromCart from './remove-products-from-cart';

export default async function updateCartItems(cartItems) {
    const [cart] = await asyncStencilUtils.api.cart.getCart();
    const cartItemsToUpdate = [];
    const currentCartItems = [
        ...cart.lineItems.physicalItems,
        ...cart.lineItems.digitalItems,
    ];

    for (const cartItem of currentCartItems) {
        const cartItemInArgs = cartItems.find(({ productId, sku }) => (
            sku ? cartItem.sku === sku : cartItem.productId == productId
        ));

        if (cartItemInArgs) {
            cartItemsToUpdate.push(cartItem);
        }
    }

    try {
        for (const cartItem of cartItemsToUpdate) {
            // eslint-disable-next-line no-await-in-loop
            await updateCartItemWithAcumaticaPrice({
                cartId: cart.id,
                lineItemId: cartItem.id,
                sku: cartItem.sku,
                productId: cartItem.productId,
                qty: cartItem.quantity,
            });
        }
    } catch (err) {
        console.error(err);

        for (const cartItem of cartItemsToUpdate) {
            // eslint-disable-next-line no-await-in-loop
            asyncStencilUtils.api.cart.itemRemove(cartItem.id);
        }
    }
}
