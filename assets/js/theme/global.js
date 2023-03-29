import './global/jquery-migrate';
import './common/select-option-plugin';
import PageManager from './page-manager';
import quickSearch from './global/quick-search';
import currencySelector from './global/currency-selector';
import mobileMenuToggle from './global/mobile-menu-toggle';
import menu from './global/menu';
import foundation from './global/foundation';
import quickView from './global/quick-view';
import cartPreview from './global/cart-preview';
import privacyCookieNotification from './global/cookieNotification';
import maintenanceMode from './global/maintenanceMode';
import carousel from './common/carousel';
import loadingProgressBar from './global/loading-progress-bar';
import svgInjector from './global/svg-injector';
import objectFitImages from './global/object-fit-polyfill';
import 'regenerator-runtime/runtime';

import { initAcumaticaPrices } from './four13/tranzetta';
import { applyFour13B3Overrides } from './four13/b3';

export default class Global extends PageManager {
    onReady() {
        cartPreview(this.context.secureBaseUrl, this.context.cartId);
        quickSearch();
        currencySelector();
        foundation($(document));
        quickView(this.context);
        carousel();
        menu();
        mobileMenuToggle();
        privacyCookieNotification();
        maintenanceMode(this.context.maintenanceMode);
        loadingProgressBar();
        svgInjector();
        objectFitImages();

        /* BundleB2B */
        $('body').append('<script src="https://cdn.bundleb2b.net/b3-auto-loader.js"></script>');
        // $('body').append('<script src="http://127.0.0.1:8080/bundleb2b.latest.js"></script>');

        window.b3themeConfig = window.b3themeConfig || {};

        window.b3themeConfig.useJavaScript = {
            login: {
                callback() {
                    $('.body').show();
                },
            },
        };

        window.b3themeConfig.useContainers = {
            'tpa.container': '.page .page-content',
            'quickOrderPad.button.container': '.container .navUser-section--alt',
            // 'tpa.button.container': '.container .navUser-section--alt',
            'myQuote.button.container': '.container .navUser-section--alt',
            'dashboard.endMasquerade.container': '#header .branding',
            'shoppinglists.container': '.body .page',
            'addressBook.container': '.body .page',
            'buyAgain.container': '.body .page',
            'quickOrderPad.container': '.body  .page',
            'userManagement.container': '.body .page',
            'quotesList.container': '.body .page',
            'orderDetail.container': '.body .page',
            'shoppinglist.container': '.body .page',
            'rfq.quote.container': '.body .page',
        };
        /* BundleB2B */

        applyFour13B3Overrides();
        initAcumaticaPrices(this.context);
    }
}
