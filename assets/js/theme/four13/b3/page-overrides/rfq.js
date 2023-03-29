import { isEqual } from "lodash"
import { getAcumaticaPrices, generatePriceText } from "../../tranzetta"
import getCustomerSpecificPrice from "../utils/get-customer-specific-price"

export default function overrideRFQ(instance) {
  const DEFAULT_IMAGE_URL = instance.context.defaultImageURL

  instance.handleQuantityChange = async function handleQuantityChange(e) {
    const {
      dataset: { orderId },
      value,
    } = e.target
    const { productList } = this.state
    const product = productList[orderId]

    const productIndex = this.handleGetSpecifiedProductIndex(productList, product)

    if (/^\d+$/.test(value)) {
      const quantity = Math.max(0, value || 0)
      const product = productList[productIndex]
      const {
        variantPrice,
        hasPriceList,
        options,
        bulkPrices,
        offeredPrice,
        sku,
      } = product
      const variantPri = variantPrice || offeredPrice

      // const calculatedPrice = this.getCalculatedPrice(quantity, bulkPrices, variantPri, hasPriceList, options)
      const calculatedPrice = await getCustomerSpecificPrice(sku, quantity);

      productList.splice(productIndex, 1, {
        ...product,
        quantity,
        offeredPrice: calculatedPrice.value,
      })
      this.setState({
        productList: [...productList],
      })
      localStorage.setItem(
        'B3CreateQuoteProductList',
        JSON.stringify(productList),
      )
      this.renderProductList()
    }

    this.triggerQuoteNumber()
  }

  instance.handleSearchProducts = function handleSearchProducts() {
    const { $ref } = this.rfqForm
    const q = document.querySelector('#search-products-input')?.value
    const $loading = $ref.querySelector('.loadingOverlay')
    const height = document.querySelector('.form-container').clientHeight + 50
    $loading.style.height = `${height}px`

    this.setState({
      searchProductQ: q,
    })
    if (q.length > 0) {
      $loading.classList.add('show')
      stencilUtils.api.search.search(q, {
        template: 'b3/b3json',
      }, async (err, response) => {
        if (err) return null
        const {
          product_results: {
            products = [],
          },
        } = JSON.parse(response)
        const productsList = products.map(product => {
          const imageUrl = product.image ? product.image.data.replace('{:size}', 'original') : DEFAULT_IMAGE_URL
          product.imageUrl = imageUrl

          return product
        })

        const simpleProducts = productsList.filter(({ has_options }) => !has_options)

        const variants = productsList.filter(({ has_options }) => has_options)

        const validatedSimpleProducts = simpleProducts.filter(({ sku }) => sku !== '' && sku !== null && sku !== undefined)

        let visibleProducts = []

        visibleProducts = variants.concat(validatedSimpleProducts)

        if (this.isB2BUser && this.rfqForm.data.companyId) {
          const variantSkus = validatedSimpleProducts.map(({ sku }) => sku)

          const productsByPost = await this.api.getProductsBySkuQuickByPost({ variantSkus })

          const purchasableProducts = productsList.filter(({ sku }) => {
            const product = productsByPost.find(({ baseSku: baseSkuByPost }) => baseSkuByPost === sku)

            return product ? !(product.purchasingDisabled * 1) : product
          })

          visibleProducts = variants.concat(purchasableProducts)
        }

        $loading.classList.remove('show')

        const customPrices = await getAcumaticaPrices(visibleProducts.map(
          p => ({ sku: p.sku, qty: p.quantity })
        ))

        for (const product of visibleProducts) {
          const newPrice = customPrices[product.sku]
          const priceToOverride = product.price.without_tax || product.price.with_tax

          priceToOverride.value = newPrice?.value
          priceToOverride.formatted = generatePriceText(newPrice)
        }

        this.setState({
          isShowSearchProduct: true,
          searchProducts: visibleProducts,
        })
        this.handleRenderSearchProducts()
      })
    }
  }

  instance.handleAdd = async function handleAdd(e, isPDPQuickViewModal) {
    e.preventDefault()
    const isRfqSearch = false
    const product = await this.getProduct(isRfqSearch, isPDPQuickViewModal)
    const { productList } = this.state
    const { currency: productCurrencyCode } = productList[0] || {}
    if (productCurrencyCode && productCurrencyCode !== product.currency) {
      this.utils.Alert.error(this.locales.tips['addToQuoteDiffCurrency'])
      return
    }

    const productQtyAlreadyInProductList = productList.find(p => p.sku === product.sku)?.quantity ?? 0
    const customPrice = await getCustomerSpecificPrice(product.sku, product.quantity + productQtyAlreadyInProductList)
    product.variantPrice = customPrice.value
    product.offeredPrice = customPrice.value
    product.basePrice = customPrice.value

    this.assignProductToList(product)
    this.renderButton(isPDPQuickViewModal)

    this.handleShowViewMyQuotes()
  }

  instance.handleAddNoOptionsProduct = async function handleAddNoOptionsProduct(productId) {
    const { $ref } = this.rfqForm
    const $loading = $ref.querySelector('.loadingOverlay')
    try {
      const product = await this.getProduct(true, null, productId)
      const { productList } = this.state
      const { currency: productCurrencyCode } = productList[0] || {}
      if (productCurrencyCode && productCurrencyCode !== product.currency) {
        this.utils.Alert.error(this.locales.tips['addToQuoteDiffCurrency'])
        return
      }

      const productQtyAlreadyInProductList = productList.find(p => p.sku === product.sku)?.quantity ?? 0
      const customPrice = await getCustomerSpecificPrice(product.sku, product.quantity + productQtyAlreadyInProductList)
      product.variantPrice = customPrice.value
      product.offeredPrice = customPrice.value
      product.basePrice = customPrice.value

      this.assignProductToList(product)
      this.handleShowViewMyQuotes(true)
    } catch (err) {
      console.error(err)
    } finally {
      $loading.classList.remove('show')
    }
  }

  instance.handleSaveSearchProducts = async function handleSaveSearchProducts() {
    const { $ref } = this.rfqForm
    const $loading = $ref.querySelector('.loadingOverlay')
    const height = document.querySelector('.form-container').clientHeight + 50
    $loading.style.height = `${height}px`
    $loading.classList.add('show')
    const productId = document.querySelector('[name="product_id"]').value
    try {
      const product = await this.getProduct(true, null, productId, 'hasOptions')
      const { productList } = this.state
      const { currency: productCurrencyCode } = productList[0] || {}
      if (productCurrencyCode && productCurrencyCode !== product.currency) {
        this.utils.Alert.error(this.locales.tips['addToQuoteDiffCurrency'])
        return
      }

      const productQtyAlreadyInProductList = productList.find(p => p.sku === product.sku)?.quantity ?? 0
      const customPrice = await getCustomerSpecificPrice(product.sku, product.quantity + productQtyAlreadyInProductList)
      product.variantPrice = customPrice.value
      product.offeredPrice = customPrice.value
      product.basePrice = customPrice.value

      this.assignProductToList(product)
      this.handleShowViewMyQuotes(true)
      this.hideForm()
    } catch (err) {
      console.error(err)
    } finally {
      $loading.classList.remove('show')
    }
  }

  instance.handleSaveNewOptions = async function handleSaveNewOptions() {
    const {
      utils: { normalizeFormData },
    } = this
    const { $ref } = this.rfqForm
    const $loading = $ref.querySelector('.loadingOverlay')
    const height = document.querySelector('.form-container').clientHeight + 50
    $loading.style.height = `${height}px`
    const {
      currentProduct,
      productList,
      currentProductOrderId,
      currentProduct: { productId },
      originalOptions,
    } = this.state

    try {
      $loading.classList.add('show')
      const $form = document.querySelector('[data-option-form]')
      const formData = Array.from(normalizeFormData(new FormData($form)))

      const optionList = this.getProductOptionList(formData, currentProduct)

      const canAddToQuote = this.isAllRequiredOptionFilled(originalOptions, optionList)
      if (!canAddToQuote) return

      const $saveBtn = document.querySelector('.cancel-save-options')
      $saveBtn.setAttribute('disabled', 'true')

      const pricePromiseResult = await this.api.getPrice(productId, optionList)

      const {
        sku,
        v3_variant_id: variantId,
        price,
      } = pricePromiseResult ?? {}

      const priceContainer = price?.without_tax || price?.with_tax || {}

      const { value: basePrice, currency } = priceContainer

      const newOptions = this.getProductOptions(optionList, originalOptions)

      const {
        options: oldOptions,
        quantity,
      } = productList[currentProductOrderId]

      const {
        modifiers,
        hasPriceList,
        variantPrice,
        bulkPrices,
      } = await this.loadProduct(productId, variantId)

      const options1 = this.getModifierAdjuster(newOptions, modifiers)

      // const calculatedPrice = this.getCalculatedPrice(quantity, bulkPrices, variantPrice, hasPriceList, options1)
      const calculatedPrice = await getCustomerSpecificPrice(sku, quantity);

      const updatedProduct = {
        ...currentProduct,
        sku,
        variantId: variantId || '',
        basePrice,
        currency,
        offeredPrice: calculatedPrice.value ?? 0,
        options: newOptions,
        bulkPrices,
        variantPrice: calculatedPrice.value ?? 0,
      }

      if (!isEqual(newOptions, oldOptions)) {
        this.handleUpdatedProduct(productList, updatedProduct, currentProductOrderId)
      } else {
        localStorage.setItem(
          'B3CreateQuoteProductList',
          JSON.stringify(productList),
        )
      }
      $saveBtn.setAttribute('disabled', 'false')
    } catch (error) {
      console.error(error)
    } finally {
      $loading.classList.remove('show')
    }

    this.hideForm()
    this.renderProductList()
  }

  instance.renderProductList = function renderProductList() {
    this.handleSetProduct()
    const { productList, currency } = this.state
    const { currencyFormat } = this.utils
    const $productsContainer = this.rfqForm.$ref.querySelector(
      '.products-container',
    )

    const products = productList.map(item => {
      const { offeredPrice, options, imageUrl } = item
      const formattedPrice = currencyFormat(offeredPrice, false, false, currency)
      return {
        formatBasePrice: formattedPrice !== '0.00' ? formattedPrice : `${currency.token}${formattedPrice}`,
        // formatBasePrice: currencyFormat(offeredPrice, false, false, currency),
        isEditable: options.length > 0,
        ...item,
        imageUrl: imageUrl || DEFAULT_IMAGE_URL,
      }
    })

    const $formProducts = this.tpls.formProducts({
      productList: products,
    })

    $productsContainer.innerHTML = $formProducts
  }
}
