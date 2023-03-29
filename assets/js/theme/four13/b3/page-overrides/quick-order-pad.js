import wrapAddProducts from "../utils/wrap-add-products"
import updateCartItems from "../utils/update-cart-items"
import removeProductsFromCart from "../utils/remove-products-from-cart"
import { getAcumaticaPrices } from "../../tranzetta"

export default function overrideQuickOrderPad(instance) {
  wrapAddProducts(instance)

  instance.addQuickOrderToCart = async function addQuickOrderToCart(itemArr, _default) {
    window.B3Spinner.show()

    const customPrices = await getAcumaticaPrices(itemArr.map(
      p => ({ sku: p.variantSku })
    ))

    const itemsToBeProcessed = itemArr.filter(({ variantSku }) => customPrices[variantSku].value)
    const cannotBeProcessedSkus = itemArr
      .filter(({ variantSku }) => !customPrices[variantSku].value)
      .map(({ variantSku }) => variantSku)

    if (itemsToBeProcessed.length) await removeProductsFromCart(itemsToBeProcessed);

    for (const item of itemsToBeProcessed) {
      const formData = new FormData()

      let optionList

      if (_default) {
        optionList = item.optionList ? item.optionList : []
      } else {
        optionList = item.optionList ? item.optionList[0] : []
      }

      formData.append('action', 'add')
      formData.append('product_id', item.productId)
      formData.append('qty[]', item.quantity)

      for (let j = 0; j < optionList.length; j += 1) {
        if (_default) {
          formData.append(`attribute[${optionList[j].optionId || optionList[j].option_id}]`, optionList[j].id)
        } else {
          formData.append(`attribute[${optionList[j].optionId || optionList[j].option_id}]`, optionList[j].option_value)
        }
      }

      await new Promise((resolve, reject) => {
        this.stencilUtils.api.cart.itemAdd(formData, (err, response) => {
          if (err || response?.data?.error) {
            window.B3Spinner.hide()

            if (_default) {
              document.querySelector(`[data-element-id='${item.elementId}'] .th-col-message`).innerHTML = response?.data?.error || this.text['qop.out.off.stock']
            } else {
              const $errMessage = document.createElement('div')

              $errMessage.append(
                this.utils.text('qop.sku.error', {
                  hash: {
                    sku: item.sku || item.variantSku,
                    errorInfo: response?.data?.error || item.sku || item.variantSku,
                  },
                }),
              )
              document.querySelector('#csv_err_message').append($errMessage)
            }

            return reject(err || response.data.error)
          }

          this.state.successNumber += 1
          if (_default) document.querySelector(`[data-element-id='${item.elementId}']`).remove()

          return resolve()
        })
      })
    }

    if (itemsToBeProcessed.length) {
      await updateCartItems(itemsToBeProcessed.map(product => ({ ...product, sku: product.variantSku })))
    }

    if (this.state.successNumber === 0) {
      if (cannotBeProcessedSkus.length > 0) {
        let message = 'All SKUs provided cannot be processed.\n'
        message += 'Please call for price of the following SKUs:\n\n'
        message += cannotBeProcessedSkus.join('\n')
        this.utils.Alert.error(message)
      }
      return
    }

    this.triggerCartNumber()

    if (cannotBeProcessedSkus.length === 0) {
      this.utils.Alert.success(this.locales.tips.addProductsSuccess)
    } else {
      let message = 'Not all SKUs are processed.\n'
      message += 'Please call for price of the following SKUs:\n\n'
      message += cannotBeProcessedSkus.join('\n')
      this.utils.Alert.warning(message)
    }

    window.B3Spinner.hide()
    if (_default) {
      document.querySelector('.result-message').innerHTML = this.utils.text('qop.success.add', {
        hash: {
          successNumber: this.state.successNumber,
        },
      })
    }
  }

  instance.addToCartCotent = function addToCartCotent(elements) {
    if (elements.length === 0) {
      return
    }
    const itemArr = []

    elements.forEach(item => {
      const productObj = {}
      productObj.elementId = item.getAttribute('data-element-id')
      productObj.productId = item.getAttribute('data-product-id')
      productObj.quantity = item.querySelector('[data-qty]').value
      productObj.variantSku = item.querySelector('[data-sku]').value
      const optionList = JSON.parse(item.getAttribute('data-product-options') || '[]')

      if (optionList.length > 0) {
        productObj.optionList = optionList
      }

      if (productObj.elementId && productObj.productId && productObj.quantity) {
        itemArr.push(productObj)
      }
    })
    this.initAddData()
    if (itemArr.length === 0) return
    this.addQuickOrderToCart(itemArr, true)
  }
}
