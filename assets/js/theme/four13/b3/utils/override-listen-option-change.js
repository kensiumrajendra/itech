/* Below are overridden ESLint rules to match formatting of BundleB2B code */
/* eslint-disable semi */
/* eslint-disable no-unused-expressions */
/* eslint indent: ["error", 2] */

import getCustomerSpecificPrice from './get-customer-specific-price'

export default function overrideListenOptionChange(instance) {
  const {
    api,
    text,
    utils,
    locales,
    serialize,
    stencilUtils,
    modifierParentIdSeparate,
  } = instance

  const { tips } = locales
  const { Alert } = utils

  const callback = e => {
    const $btnOptionUpdate = document.querySelector('#btn_option_update')
    $btnOptionUpdate?.setAttribute('disabled', 'true')
    const { target } = e
    window.target = target

    let frage = ''

    // original version
    // const searchTable = target.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode

    // optimize
    const parentId = target.id.includes(modifierParentIdSeparate) ? target.id.split(modifierParentIdSeparate).pop() : null
    const searchTable = parentId ? document.querySelector(`.search-product-table [data-product-id="${parentId}"]`) : target.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode

    const form = searchTable.querySelector('[data-option-form]')
    const productId = searchTable.querySelector('[name="product_id"]').value
    const optionChangeData = serialize(form)
    const skuConatainer = searchTable.querySelector('[data-product-sku]')
    const tr = parentId ? searchTable : searchTable.querySelector('tr') // original version
    Object.keys(optionChangeData).forEach(key => {
      frage += `${encodeURIComponent(key)}=${encodeURIComponent(optionChangeData[key])}&`
    })

    window.B3Spinner.show()
    stencilUtils.api.productAttributes.optionChange(productId, frage, async (err, result) => {
      try {
        $btnOptionUpdate?.removeAttribute('disabled')
        if (err) {
          window.B3Spinner.hide()
          return Alert.error(err)
        }
        const { data = {} } = result
        const variantId = data.v3_variant_id
        if (!variantId) {
          const item = tr.querySelector('input[type=checkbox]')
          const selectedItem = tr.querySelector('[data-results-select]')
          if (selectedItem) selectedItem.setAttribute('disabled', 'true')
          if (item) {
            item.setAttribute('disabled', 'true')
            item.checked = false
          }

          window.B3Spinner.hide()
          return false
        }

        const qty = +searchTable.dataset.lineQty ?? +searchTable.querySelector('input[type=text]').value ?? 1
        const price = await getCustomerSpecificPrice(data.sku, qty)
        const priceFormatted = price.formatted
        const priceContainer = searchTable.querySelector('[data-product-price-value]')

        priceContainer.innerHTML = priceFormatted
        priceContainer.setAttribute('data-product-price-value', price?.value)

        if (data.sku) {
          skuConatainer.innerHTML = `<b>${text['shopping.list.td.sku.label']}</b>${data.sku}`
          searchTable.querySelector('[data-product-base-sku]')?.setAttribute('data-product-base-sku', data.sku)
        }
        // page right option change

        if (variantId) {
          tr.setAttribute('data-variant-id', variantId)

          const products = [{
            productId,
            variantId,
          }]
          const { list } = await api.getInventory({ products })
          $btnOptionUpdate?.removeAttribute('disabled')
          if (list.purchasingDisabled) {
            utils.Alert.error(tips.buyAgainFailedNoLongerForSale)
          }
        }

        tr.querySelector('input[type=checkbox]')?.removeAttribute('disabled')
        tr.querySelector('[data-results-select]')?.removeAttribute('disabled')
        window.B3Spinner.hide()
        $btnOptionUpdate?.removeAttribute('disabled')
        return true
      } catch (error) {
        window.B3Spinner.hide()
      }
    })
  }

  instance.listenOptionChange = function listenOptionChange() {
    stencilUtils.hooks.on('product-option-change', callback)
  }

  instance.offOptionChangeHook = function offOptionChangeHook() {
    stencilUtils.hooks.off('product-option-change', callback)
  }
}
