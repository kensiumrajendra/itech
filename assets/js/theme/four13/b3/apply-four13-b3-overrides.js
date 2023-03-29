import _ from 'lodash';

import {
    overrideBuyAgain,
    overrideOrderDetail,
    overrideOrders,
    overrideQuickOrderPad,
    overrideRFQ,
    overrideShoppingList,
} from './page-overrides';

export default function applyFour13B3Overrides() {
    _.merge(window.b3themeConfig.useJavaScript, {
        accountsetting: {
            // callback() {
            //     // Add `readonly` attribute to the "Role" input to match other input fields' style (if disabled)
            //     const roleInput = document.querySelector('#b2b-account-role input');
            //     if (roleInput?.disabled) roleInput.setAttribute('readonly', '');
            // },
        },
        rfq: {
            beforeMount(instance) {
                overrideRFQ(instance);
            },
        },
        orders: {
            beforeMount(instance) {
                overrideOrders(instance);
            },
        },
        orderdetail: {
            beforeMount(instance) {
                overrideOrderDetail(instance);
            },
        },
        quickorderpad: {
            beforeMount(instance) {
                overrideQuickOrderPad(instance);
            },
        },
        shoppinglist: {
            beforeMount(instance) {
                overrideShoppingList(instance);
            },
            // callback() {
            //     const currentPage = new URL(window.location.href);

            //     if (currentPage.pathname === '/shopping-list/') {
            //         const footer = document.querySelector('footer');
            //         const footerContentContainer = footer.querySelector('.container');

            //         // A PR from BC (https://github.com/bigcommerce/cornerstone/pull/2119) has broken BundleB2B's
            //         // fixed bottom cart container (it's not fixed to the bottom anymore). We are only removing the
            //         // transform in the shopping list page to keep the fix for pages with slick slider.
            //         footer.style.transform = 'unset';

            //         // Add some space between the copyright container and the bottom cart when scrolled to the bottom.
            //         footerContentContainer.style.paddingBottom = '1rem';
            //     }
            // },
        },
        buyagain: {
            beforeMount(instance) {
                overrideBuyAgain(instance);
            },
        },
    });
}
