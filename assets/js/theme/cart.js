import PageManager from './page-manager';
import _ from 'lodash';
import giftCertCheck from './common/gift-certificate-validator';
import utils from '@bigcommerce/stencil-utils';
import ShippingEstimator from './cart/shipping-estimator';
import { defaultModal } from './global/modal';
import swal from './global/sweet-alert';

import { updateCartItemWithAcumaticaPrice, getAcumaticaPrices } from './four13/tranzetta';
import asyncUtils from './common/utils/async-stencil-utils';

export default class Cart extends PageManager {
    onReady() {
        this.$cartContent = $('[data-cart-content]');
        this.$cartMessages = $('[data-cart-status]');
        this.$cartTotals = $('[data-cart-totals]');
        this.$overlay = $('[data-cart] .loadingOverlay')
            .hide(); // TODO: temporary until roper pulls in his cart components

        this.bindEvents();
    }

    async cartUpdate($target) {
        const itemId = $target.data('cartItemid');
        const inventoryId = $target.data('cartItemInventoryId');
        const productId = $target.data('cartItemProductId');

        const $el = $(`#qty-${itemId}`);
        const oldQty = parseInt($el.val(), 10);
        const maxQty = parseInt($el.data('quantityMax'), 10);
        const minQty = parseInt($el.data('quantityMin'), 10);
        const minError = $el.data('quantityMinError');
        const maxError = $el.data('quantityMaxError');

        let newQty=parseInt(Number($el.val()), 10)
        let invalidEntry=oldQty
        if ($target.data('action') === 'inc') {
            if (maxQty > 0) {
                if ((oldQty + 1) <= maxQty) {
                    newQty = invalidEntry+1;
                }
            } else {
                newQty = invalidEntry+1;
            }
        } else if (oldQty >= 1) {
            if (minQty > 0) {
                if ((oldQty - 1) >= minQty) {
                    newQty = invalidEntry-1;
                }
            } else {
                newQty = invalidEntry-1;
            }
        }
        
        // Does not quality for min/max quantity
        if (newQty < minQty) {
            return swal({
                text: minError,
                type: 'error',
            });
        } else if (maxQty > 0 && newQty > maxQty) {
            return swal({
                text: maxError,
                type: 'error',
            });
        }

        this.$overlay.show();

        try {
            const response = await asyncUtils.api.cart.itemUpdate(itemId, newQty);
            const [cart] = await asyncUtils.api.cart.getCart();
            const { id: cartId } = cart;

            if (response.data.status === 'succeed') {
                // if the quantity is changed "1" from "0", we have to remove the row.
                const remove = (newQty === 0);

                // update cart item with Acumatica price after updating qty
                if (!remove) {
                    try {
                        await updateCartItemWithAcumaticaPrice({
                            cartId,
                            lineItemId: itemId,
                            sku: inventoryId,
                            productId,
                            qty: newQty,
                        });

                        // not sure what is the Back Order app script's intent on reloading the page after
                        // qty change we'll respect it for now and reload the page upon qty change
                        window.location.reload();
                    } catch (cartUpdateError) {
                        console.error(cartUpdateError);

                        swal({
                            text: 'Something went wrong while updating the cart item quantity. Removing line item from cart to prevent incorrect price...',
                            type: 'error',
                        });

                        // Remove cart line item from cart in case something went wrong.
                        await asyncUtils.api.cart.itemRemove(itemId);
                    }
                }

                await this.refreshContent(remove);
            } else {
                $el.val(oldQty);
                swal({
                    text: response.data.errors.join('\n'),
                    type: 'error',
                });
            }
        } finally {
            this.$overlay.hide();
        }
    }

    async cartUpdateQtyTextChange($target, preVal = null) {
        const itemId = $target.data('cartItemid');
        const inventoryId = $target.data('cartItemInventoryId');
        const productId = $target.data('cartItemProductId');

        const $el = $(`#qty-${itemId}`);
        const maxQty = parseInt($el.data('quantityMax'), 10);
        const minQty = parseInt($el.data('quantityMin'), 10);
        const oldQty = preVal !== null ? preVal : minQty;
        const minError = $el.data('quantityMinError');
        const maxError = $el.data('quantityMaxError');
        const newQty = parseInt(Number($el.val()), 10);
        let invalidEntry;

        // Does not quality for min/max quantity
        if (!newQty) {
            invalidEntry = $el.val();
            $el.val(oldQty);
            return swal({
                text: `${invalidEntry} is not a valid entry`,
                type: 'error',
            });
        } else if (newQty < minQty) {
            $el.val(oldQty);
            return swal({
                text: minError,
                type: 'error',
            });
        } else if (maxQty > 0 && newQty > maxQty) {
            $el.val(oldQty);
            return swal({
                text: maxError,
                type: 'error',
            });
        }
        this.$overlay.show();

        try {
            const response = await asyncUtils.api.cart.itemUpdate(itemId, newQty);
            const [cart] = await asyncUtils.api.cart.getCart();
            const { id: cartId } = cart;

            if (response.data.status === 'succeed') {
                // if the quantity is changed "1" from "0", we have to remove the row.
                const remove = (newQty === 0);

                // update cart item with Acumatica price after updating qty
                if (!remove) {
                    try {
                        await updateCartItemWithAcumaticaPrice({
                            cartId,
                            lineItemId: itemId,
                            sku: inventoryId,
                            productId,
                            qty: newQty,
                        });

                        // not sure what is the Back Order app script's intent on reloading the page after
                        // qty change we'll respect it for now and reload the page upon qty change
                        window.location.reload();
                    } catch (_cartUpdateError) {
                        swal({
                            text: 'Something went wrong while updating the cart item quantity. Removing line item from cart to prevent incorrect price...',
                            type: 'error',
                        });

                        // Remove cart line item from cart in case something went wrong.
                        await asyncUtils.api.cart.itemRemove(itemId);
                    }
                }

                await this.refreshContent(remove);
            } else {
                $el.val(oldQty);
                swal({
                    text: response.data.errors.join('\n'),
                    type: 'error',
                });
            }
        } finally {
            this.$overlay.hide();
        }
    }

    cartRemoveItem(itemId) {
        this.$overlay.show();
        utils.api.cart.itemRemove(itemId, (err, response) => {
            if (response.data.status === 'succeed') {
                this.refreshContent(true);
            } else {
                swal({
                    text: response.data.errors.join('\n'),
                    type: 'error',
                });
            }
        });
    }

    cartEditOptions(itemId) {
        const modal = defaultModal();
        const options = {
            template: 'cart/modals/configure-product',
        };

        const $lineQtyEl = $(`#qty-${itemId}`);
        const productId = $lineQtyEl.data('cartItemProductId');
        let sku;

        modal.open();

        utils.api.productAttributes.configureInCart(itemId, options, (err, response) => {
            modal.updateContent(response.content);

            this.bindGiftWrappingForm();

            $('#modal form').on('submit', async (event) => {
                event.preventDefault();

                const form = event.target;
                // We're using `form.getAtrribute('action')` instead of just `form.action` because the
                // latter will actually access an <input> element with the name 'action' in this form.
                const formAction = form.getAttribute('action');
                const submitBtn = form.querySelector('input[type=submit]');
                const submitBtnOldText = submitBtn.value;

                submitBtn.value = 'Updating...';
                submitBtn.setAttribute('disabled', '');

                try {
                    await fetch(formAction, { method: form.method, body: new FormData(form) });

                    const qty = parseInt($lineQtyEl.val(), 10);
                    const [cart] = await asyncUtils.api.cart.getCart();
                    const { id: cartId } = cart;

                    await updateCartItemWithAcumaticaPrice({
                        lineItemId: itemId,
                        cartId,
                        sku,
                        productId,
                        qty,
                    });

                    modal.close();
                    this.refreshContent();
                } catch {
                    swal({
                        text: 'Something went wrong while updating the product options.',
                        type: 'error',
                    });

                    // Remove cart line item from cart in case something went wrong.
                    utils.api.cart.itemRemove(itemId);

                    submitBtn.value = submitBtnOldText;
                    submitBtn.removeAttribute('disabled');
                }
            });
        });

        utils.hooks.on('product-option-change', (event, option) => {
            const $changedOption = $(option);
            const $form = $changedOption.parents('form');
            const $submit = $('input.button', $form);
            const $messageBox = $('.alertMessageBox');
            const item = $('[name="item_id"]', $form).attr('value');

            const toggleProductOptionsDisabled = () => {
                // Must have a small delay because BC Stencil Utils check for product 
                // option input's disabled property upon change and exclude it in payload.
                setTimeout(() => {
                    $form.find('[data-product-attribute]').each((_, formFieldEl) => {
                        const $formFieldEl = $(formFieldEl);
                        const $inputEl = $('[name^=attribute]', $formFieldEl);
                        const currentDisabledValue = $inputEl.prop('disabled');

                        $inputEl.prop('disabled', !currentDisabledValue);
                    });
                }, 100);
            };

            $submit.prop('disabled', true);
            toggleProductOptionsDisabled();

            utils.api.productAttributes.optionChange(productId, $form.serialize(), async (err, result) => {
                const data = result.data || {};

                if (err) {
                    swal({
                        text: err,
                        type: 'error',
                    });
                    return false;
                }

                const qty = parseInt($lineQtyEl.val(), 10);
                let price;
                sku = data.sku;

                try {
                    const pricesResponse = await getAcumaticaPrices([{ sku: data.sku, qty }]);
                    price = pricesResponse[data.sku];
                    $submit.prop('disabled', false);
                } catch {
                    $('p.alertBox-message', $messageBox).text('Something went wrong while getting the prices from the database.');
                    $submit.prop('disabled', true);
                    $messageBox.show();
                } finally {
                    toggleProductOptionsDisabled();
                }

                if (data.purchasing_message) {
                    $('p.alertBox-message', $messageBox).text(data.purchasing_message);
                    $submit.prop('disabled', true);
                    $messageBox.show();
                } else {
                    $submit.prop('disabled', false);
                    $messageBox.hide();
                }

                if (!data.purchasable || !data.instock) {
                    $submit.prop('disabled', true);
                } else {
                    $submit.prop('disabled', false);
                }

                if (price.value === null) {
                    $('p.alertBox-message', $messageBox).text('No price in the database for this variant, please call for pricing.');
                    $submit.prop('disabled', true);
                    $messageBox.show();
                } else {
                    $submit.prop('disabled', false);
                    $messageBox.hide();
                }
            });
        });
    }

    async refreshContent(remove) {
        const $cartItemsRows = $('[data-item-row]', this.$cartContent);
        const $cartPageTitle = $('[data-cart-page-title]');
        const options = {
            template: {
                content: 'cart/content',
                totals: 'cart/totals',
                pageTitle: 'cart/page-title',
                statusMessages: 'cart/status-messages',
            },
        };

        this.$overlay.show();

        // Remove last item from cart? Reload
        if (remove && $cartItemsRows.length === 1) {
            return window.location.reload();
        }

        try {
            const response = await asyncUtils.api.cart.getContent(options);

            this.$cartContent.html(response.content);
            this.$cartTotals.html(response.totals);
            this.$cartMessages.html(response.statusMessages);

            $cartPageTitle.replaceWith(response.pageTitle);
            this.bindEvents();

            const quantity = $('[data-cart-quantity]', this.$cartContent).data('cartQuantity') || 0;

            $('body').trigger('cart-quantity-update', quantity);
        } catch (err) {
            console.error(err);
        } finally {
            this.$overlay.hide();
        }
    }

    bindCartEvents() {
        const debounceTimeout = 400;
        const cartRemoveItem = _.bind(_.debounce(this.cartRemoveItem, debounceTimeout), this);

        this.bindCartQtyUpdate();

        $('.cart-remove', this.$cartContent).on('click', event => {
            const itemId = $(event.currentTarget).data('cartItemid');
            const string = $(event.currentTarget).data('confirmDelete');
            swal({
                text: string,
                type: 'warning',
                showCancelButton: true,
            }).then(() => {
                // remove item from cart
                cartRemoveItem(itemId);
            });
            event.preventDefault();
        });

        $('[data-item-edit]', this.$cartContent).on('click', event => {
            const itemId = $(event.currentTarget).data('itemEdit');

            event.preventDefault();
            // edit item in cart
            this.cartEditOptions(itemId);
        });
    }

    bindCartQtyUpdate() {
        const debounceTimeout = 400;
        const cartUpdate = _.bind(_.debounce(this.cartUpdate, debounceTimeout), this);
        const cartUpdateQtyTextChange = _.bind(_.debounce(this.cartUpdateQtyTextChange, debounceTimeout), this);
        let preVal

        // cart update
        $('[data-cart-update]', this.$cartContent).on('click', event => {
            const $target = $(event.currentTarget);

            event.preventDefault();

            // update cart quantity
            cartUpdate($target);
        });

        // cart qty manually updates
        $('.cart-item-qty-input', this.$cartContent).on('focus', function onQtyFocus() {
            preVal = this.value;
        }).change(event => {
            const $target = $(event.currentTarget);
            event.preventDefault();

            // update cart quantity
            cartUpdateQtyTextChange($target, preVal);
        });
    }

    bindPromoCodeEvents() {
        const $couponContainer = $('.coupon-code');
        const $couponForm = $('.coupon-form');
        const $codeInput = $('[name="couponcode"]', $couponForm);

        $('.coupon-code-add').on('click', event => {
            event.preventDefault();

            $(event.currentTarget).hide();
            $couponContainer.show();
            $('.coupon-code-cancel').show();
            $codeInput.trigger('focus');
        });

        $('.coupon-code-cancel').on('click', event => {
            event.preventDefault();

            $couponContainer.hide();
            $('.coupon-code-cancel').hide();
            $('.coupon-code-add').show();
        });

        $couponForm.on('submit', event => {
            const code = $codeInput.val();

            event.preventDefault();

            // Empty code
            if (!code) {
                return swal({
                    text: $codeInput.data('error'),
                    type: 'error',
                });
            }

            utils.api.cart.applyCode(code, (err, response) => {
                if (response.data.status === 'success') {
                    this.refreshContent();
                } else {
                    swal({
                        text: response.data.errors.join('\n'),
                        type: 'error',
                    });
                }
            });
        });
    }

    bindGiftCertificateEvents() {
        const $certContainer = $('.gift-certificate-code');
        const $certForm = $('.cart-gift-certificate-form');
        const $certInput = $('[name="certcode"]', $certForm);

        $('.gift-certificate-add').on('click', event => {
            event.preventDefault();
            $(event.currentTarget).toggle();
            $certContainer.toggle();
            $('.gift-certificate-cancel').toggle();
        });

        $('.gift-certificate-cancel').on('click', event => {
            event.preventDefault();
            $certContainer.toggle();
            $('.gift-certificate-add').toggle();
            $('.gift-certificate-cancel').toggle();
        });

        $certForm.on('submit', event => {
            const code = $certInput.val();

            event.preventDefault();

            if (!giftCertCheck(code)) {
                return swal({
                    text: $certInput.data('error'),
                    type: 'error',
                });
            }

            utils.api.cart.applyGiftCertificate(code, (err, resp) => {
                if (resp.data.status === 'success') {
                    this.refreshContent();
                } else {
                    swal({
                        text: resp.data.errors.join('\n'),
                        type: 'error',
                    });
                }
            });
        });
    }

    bindGiftWrappingEvents() {
        const modal = defaultModal();

        $('[data-item-giftwrap]').on('click', event => {
            const itemId = $(event.currentTarget).data('itemGiftwrap');
            const options = {
                template: 'cart/modals/gift-wrapping-form',
            };

            event.preventDefault();

            modal.open();

            utils.api.cart.getItemGiftWrappingOptions(itemId, options, (err, response) => {
                modal.updateContent(response.content);

                this.bindGiftWrappingForm();
            });
        });
    }

    bindGiftWrappingForm() {
        $('.giftWrapping-select').on('change', event => {
            const $select = $(event.currentTarget);
            const id = $select.val();
            const index = $select.data('index');

            if (!id) {
                return;
            }

            const allowMessage = $select.find(`option[value=${id}]`).data('allowMessage');

            $(`.giftWrapping-image-${index}`).hide();
            $(`#giftWrapping-image-${index}-${id}`).show();

            if (allowMessage) {
                $(`#giftWrapping-message-${index}`).show();
            } else {
                $(`#giftWrapping-message-${index}`).hide();
            }
        });

        $('.giftWrapping-select').trigger('change');

        function toggleViews() {
            const value = $('input:radio[name ="giftwraptype"]:checked').val();
            const $singleForm = $('.giftWrapping-single');
            const $multiForm = $('.giftWrapping-multiple');

            if (value === 'same') {
                $singleForm.show();
                $multiForm.hide();
            } else {
                $singleForm.hide();
                $multiForm.show();
            }
        }

        $('[name="giftwraptype"]').on('click', toggleViews);

        toggleViews();
    }

    cleanCartQtyEventListeners() {
        setTimeout(() => {
            document.querySelectorAll('.form-increment').forEach(e => {
                e.innerHTML = e.innerHTML;
            })
        
            // rebind the cart qty update events
            this.bindCartQtyUpdate()
        }, 1)
    }

    overrideBackOrderScript() {
        document.querySelectorAll('.form-increment button, .form-increment input').forEach(e => {
            const originalAddEventListener = e.addEventListener;

            e.addEventListener = () => {
                // originalAddEventListener.apply(this, arguments);
                this.cleanCartQtyEventListeners();
            }
        })
    }

    bindEvents() {
        this.bindCartEvents();
        this.bindPromoCodeEvents();
        this.bindGiftWrappingEvents();
        this.bindGiftCertificateEvents();

        this.overrideBackOrderScript();

        // initiate shipping estimator module
        this.shippingEstimator = new ShippingEstimator($('[data-shipping-estimator]'));
    }
}
