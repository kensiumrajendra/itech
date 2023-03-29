import getCustomerSpecificPrice from "../utils/get-customer-specific-price"
import wrapAddProducts from "../utils/wrap-add-products"

export default function overrideBuyAgain(instance) {
  wrapAddProducts(instance)

  instance.getBasePrice = async function getBasePrice(item) {
    const optionList = item.optionList.map(option => {
      const { product_option_id: optionId, value } = option
      return {
        option_id: `attribute[${optionId}]`,
        option_value: value,
      }
    })

    let basePrice

    try {
      basePrice = await new Promise((resolve, reject) => {
        this.api.getPrice(item.productId, optionList).then(response => {
          resolve({
            productId: item.productId,
            variantId: item.variantId,
            data: response,
          })
        }).catch(reject)
      })
    } catch (err) {
      throw err;
    }

    try {
      const { sku, price } = basePrice.data
      const newPrice = await getCustomerSpecificPrice(sku, 1)
      const priceToOverride = price.without_tax || price.with_tax

      priceToOverride.value = newPrice.value
      priceToOverride.formatted = newPrice.formatted
    } catch (err) {
      console.error(err)
    }

    return basePrice
  }

  instance.bindQtyEvents = function bindQtyEvents() {
    const setListItem = item => {
      const {
        orderList,
      } = this.state

      this.setState({
        orderList: orderList.map(listItem => {
          let itemObj = {}
          if ((item.productId === listItem.productId) && (item.variantId === listItem.variantId)) {
            itemObj = item
          }
          return {
            ...listItem,
            ...itemObj,
          }
        }),
      })
    }

    this.utils.on('[data-product-id]', 'click', 'btn-qty-decrease', async $tr => {
      const listItem = this.getListItem($tr)
      listItem.qty -= listItem.qtyIncrement
      if (listItem.qty <= listItem.minOrderQty) {
        listItem.qty = +listItem.minOrderQty
      }

      const $input = $tr.querySelector('.qty-input')
      $input.value = listItem.qty

      const newPrice = await getCustomerSpecificPrice(listItem.sku, listItem.qty);
      listItem.basePrice = newPrice.formatted
      listItem.basePriceValue = newPrice.value

      setListItem(listItem)
      this.renderOrderList()
    })

    this.utils.on('[data-product-id]', 'click', 'btn-qty-increase', async $tr => {
      const listItem = this.getListItem($tr)
      listItem.qty += +listItem.qtyIncrement

      const $input = $tr.querySelector('.qty-input')
      $input.value = listItem.qty

      const newPrice = await getCustomerSpecificPrice(listItem.sku, listItem.qty);
      listItem.basePrice = newPrice.formatted
      listItem.basePriceValue = newPrice.value

      setListItem(listItem)
      this.renderOrderList()
    })

    this.utils.on('[data-product-id]', 'change', 'qty-input', async ($tr, target) => {
      const listItem = this.getListItem($tr)
      const value = +target.value
      if (typeof value === 'number' && String(value) !== 'NaN') {
        if (value <= listItem.minOrderQty) {
          listItem.qty = +listItem.minOrderQty
        } else listItem.qty = value
      } else {
        listItem.qty = +listItem.minOrderQty
      }

      const $input = $tr.querySelector('.qty-input')
      $input.value = listItem.qty

      const newPrice = await getCustomerSpecificPrice(listItem.sku, listItem.qty)
      listItem.basePrice = newPrice.formatted
      listItem.basePriceValue = newPrice.value

      setListItem(listItem)
      this.renderOrderList()
    })
  }
}
