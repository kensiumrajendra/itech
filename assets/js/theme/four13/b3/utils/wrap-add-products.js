import _ from 'lodash';

import resetObjectPropertyDescriptors from './reset-object-property-descriptors';
import removeProductsFromCart from './remove-products-from-cart';
import updateCartItems from './update-cart-items';

export default function wrapAddProducts(instance) {
    const originalAddProducts = instance.api.addProducts;

    resetObjectPropertyDescriptors(instance, ['api']);

    instance.api.addProducts = async function addProducts() {
        const { lineItems } = _.cloneDeep(arguments[0]);

        try {
            await removeProductsFromCart(lineItems);
            await originalAddProducts.apply(this, arguments);
        } catch (err) {
            throw err;
        }

        try {
            await updateCartItems(lineItems);
        } catch (err) {
            console.error(err);
        }
    };
}
