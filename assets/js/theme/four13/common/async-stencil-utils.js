import utils from '@bigcommerce/stencil-utils';

export default {
    api: {
        cart: {
            /** Promisified version of stencil-utils' `api.cart.itemUpdate()` function  */
            async itemUpdate(itemId, newQty) {
                return new Promise((resolve, reject) => {
                    utils.api.cart.itemUpdate(itemId, newQty, (err, response) => {
                        if (err) return reject(err);
                        return resolve(response);
                    });
                });
            },

            /** Promisified version of stencil-utils' `api.cart.getContent()` function  */
            async getContent(options) {
                return new Promise((resolve, reject) => {
                    utils.api.cart.getContent(options, (err, response) => {
                        if (err) return reject(err);
                        return resolve(response);
                    });
                });
            },

            /** Promisified version of stencil-utils' `api.cart.getCart()` function  */
            async getCart(options) {
                return new Promise((resolve, reject) => {
                    utils.api.cart.getCart(options, (err, response) => {
                        if (err) return reject(err);
                        return resolve(response);
                    });
                });
            },

            /** Promisified version of stencil-utils' `api.cart.itemRemove()` function  */
            async itemRemove(options) {
                return new Promise((resolve, reject) => {
                    utils.api.cart.itemRemove(options, (err, response) => {
                        if (err) return reject(err);
                        return resolve(response);
                    });
                });
            },

            /** Promisified version of stencil-utils' `api.cart.itemAdd()` function  */
            async itemAdd(options) {
                return new Promise((resolve, reject) => {
                    utils.api.cart.itemAdd(options, (err, response) => {
                        if (err) return reject(err);
                        return resolve(response);
                    });
                });
            },
        },

        productAttributes: {
            /** Promisified version of stencil-utils' `api.productAttributes.optionChange()` function  */
            async optionChange(productId, params, template = null) {
                return new Promise((resolve, reject) => {
                    utils.api.productAttributes.optionChange(productId, params, template, (err, response) => {
                        if (err) return reject(err);
                        return resolve(response);
                    });
                });
            },

            /** Promisified version of stencil-utils' `api.productAttributes.configureInCart()` function  */
            async configureInCart(itemId, params) {
                return new Promise((resolve, reject) => {
                    utils.api.productAttributes.configureInCart(itemId, params, (err, response) => {
                        if (err) return reject(err);
                        return resolve(response);
                    });
                });
            },
        },
    },
};
