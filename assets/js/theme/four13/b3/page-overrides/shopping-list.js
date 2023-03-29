import getCustomerSpecificPrice from '../utils/get-customer-specific-price'
import formatToUSD from '../../common/format-to-usd'

import overrideListenOptionChange from '../utils/override-listen-option-change'
import wrapAddProducts from '../utils/wrap-add-products'
import { getAcumaticaPrices } from '../../tranzetta'

export default function overrideShoppingList(instance) {
  wrapAddProducts(instance)
  overrideListenOptionChange(instance)

  instance.setPricesInfo = async function setPricesInfo(product, $product, isSetQty, optionsList, qty, productIdItem) {
    const options = optionsList.map(option => ({
      ...option,
      optionId: option.option_id.replace(/[^0-9]/ig, ''),
      optionValue: option.option_value,

    }))

    const {
      currency: bcPriceCurrency,
      value: bcPriceValue,
    } = product?.price?.with_tax || product?.price?.without_tax || {}

    const {
      productId: b3ProductId,
      basePrice: b3BasePrice,
    } = productIdItem

    const {
      currency_selector: {
        active_currency_code: activeCurrencyCode,
      },
    } = this.context

    const $priceValue = $product.querySelector('[data-product-price-value]')
    const $checkbox = $product.querySelector('.col-checkbox > input') || {}
    const $sku = $product.querySelector('.product-sku')
    const $qty = $product.querySelector('[data-advqty-sku]')
    const sku = $sku ? $sku.textContent.trim().slice(6) : $qty.dataset.advqtySku

    const calculatedPrice = await getCustomerSpecificPrice(sku, qty)

    if (isSetQty) {
      const variantId = +$product.getAttribute('data-variant-id')
      const { store_hash: storeHash } = this.context.settings
      const {
        B3Storage: { B3CompanyId },
      } = this.utils
      const companyId = B3CompanyId.value ? B3CompanyId.value : null

      const {
        productList,
      } = await this.api.getProductsBulkLoad({
        storeHash,
        currencyCode: bcPriceCurrency || activeCurrencyCode,
        companyId,
        productList: [
          {
            productId: +product.id || +b3ProductId,
            variantId,
          },
        ],
      })

      const {
        modifiers = [],
        hasPriceList,
        bulkPrices = [],
        calculatedPrice: variantPrice,
        purchasingDisabled,
      } = productList.find(({ productId }) => productId === +product.id || productId === +b3ProductId) || {}

      if ((product.can_purchase !== undefined && product.can_purchase === false) || purchasingDisabled || !product.id) {
        $checkbox.disabled = true
        $checkbox.title = this.locales.tips.buyAgainFailedNoLongerForSale
      }

      const unitPrice = variantPrice || bcPriceValue

      product.options = this.getModifierAdjuster(options || [], modifiers)

      $priceValue.setAttribute('data-product-price-value', calculatedPrice.value)
      $priceValue.innerHTML = `<span class="product-price">${this.currencyCodeFormat({ code: bcPriceCurrency || activeCurrencyCode, value: calculatedPrice.value })}</span>`
      const productSubTotalValue = calculatedPrice.value * qty
      const productSubTotal = this.currencyCodeFormat({ code: bcPriceCurrency || activeCurrencyCode, value: productSubTotalValue })
      $product.querySelector('.product-subtotal').innerHTML = productSubTotal
    } else {
      // $priceValue.setAttribute('data-product-price-value', bcPriceValue || b3BasePrice)
      // $priceValue.innerHTML = `<span class="product-price">${this.currencyCodeFormat({ code: bcPriceCurrency || activeCurrencyCode, value: bcPriceValue || b3BasePrice })}</span>`
      $priceValue.setAttribute('data-product-price-value', calculatedPrice.value)
      $priceValue.innerHTML = `<span class="product-price">${calculatedPrice.formatted}</span>`

      if (!calculatedPrice.value) {
        $checkbox.disabled = true
        $checkbox.setAttribute('style', 'cursor:not-allowed')
      }
    }

    const newGrandTotal = Array
      .from(document.querySelectorAll('#shopping_list_table .product-subtotal'))
      .reduce((sum, e) => sum + Number(e.textContent.replace(/[$,]+/g, "")), 0)

    this.setState({
      ...this.state,
      grandTotal: newGrandTotal,
    });

    this.renderShoppingListCount()
  }

  instance.bindSingleSearch = function bindSingleSearch() {
    const $btn = document.querySelector('#search_single_sku')
    const $input = document.querySelector('#product_search_input')
    const $results = document.querySelector('#product_search_results')
    const $pagination = document.querySelector('#more-results')

    const setNotFound = () => {
      $pagination.innerHTML = ''
      $results.innerHTML = (`<div style="margin-bottom:1.5rem;text-align:center;">${this.text['shopping.list.products.notFound']}</div>`)
    }

    const handleSearch = () => {
      const searchQuery = $input.value

      if (searchQuery.length >= 2) {
        this.handleInputSearch(() => {
          if (searchQuery.length < 2) return null
          window.B3Spinner.show()
          $results.innerHTML = ''
          $pagination.innerHTML = ''

          this.stencilUtils.api.search.search(searchQuery, {
            template: 'b3/b3json',
          }, async (err, response) => {
            window.B3Spinner.hide()
            if (err) return setNotFound()
            const {
              product_results: {
                products = [],
              },
            } = JSON.parse(response)
            const signleIds = []
            const optionIds = []

            if (products.length) this.listenOptionChange()

            products.forEach(({
              id,
              has_options: hasOptions,
            }) => (hasOptions ? optionIds.push({ id }) : signleIds.push({ id })))

            const { list } = await this.api.getInventory({
              products: signleIds.map(({ id: productId }) => ({
                productId,
              })),
            })

            const productIds = list.filter(({ purchasingDisabled }) => !purchasingDisabled).map(({ productId }) => ({ id: productId }))
            productIds.push(...optionIds)

            products.forEach(({ id: productId }, index) => {
              productIds.forEach(productIdItem => {
                const { id } = productIdItem
                if (productId === id) productIdItem.idx = index
              })
            })

            productIds.sort((a, b) => a.idx - b.idx)

            if (!productIds.length) return setNotFound()

            const limit = 3
            const totalPages = Math.ceil(productIds.length / limit)
            const currentPage = 1

            const searchProduct = productId => new Promise(resolve => {
              const resultContainer = this.tpls.searchResultContainerTemplate({
                productId,
              })
              $results.insertAdjacentHTML('beforeend', resultContainer)

              this.stencilUtils.api.product.getById(productId, {
                template: 'b3/b3json',
              }, async (error, res) => {
                const $productId = $results.querySelector(`.product-${productId}`)
                $productId.classList.remove('loading-span')
                let optionsHTML = ''
                if (error) return
                const {
                  product,
                } = JSON.parse(res)

                this.setState({
                  productViewOptionsMap: {
                    ...this.state.productViewOptionsMap,
                    [productId]: product,
                  },
                })

                const options = product.options.map(option => {
                  const values = option.values ? option.values.map(value => ({
                    ...value,
                    checked: false,
                    selected: false,
                  })) : []
                  return {
                    ...option,
                    checked: false,
                    values,
                  }
                })
                optionsHTML = this.renderOptions(options, productId)

                const resultHtml = this.tpls.searchResultItemTemplate({
                  showCheckBox: true,
                  showSelect: false,
                  product: {
                    ...product,
                    ...this.utils.getCorrectProductImage(product, 'main_image'),
                    optionsHTML,
                  },

                })
                // $productId.innerHTML = resultHtml

                const sku = product.sku;
                const customPrice = await getCustomerSpecificPrice(sku, 1)

                const $tempEl = document.createElement('tbody')
                $tempEl.innerHTML = resultHtml

                const $priceEl = $tempEl.querySelector('[data-product-price]')
                const $checkboxEl = $tempEl.querySelector('[data-results-check-box]')

                $priceEl.setAttribute('data-product-price-value', customPrice.value)
                $priceEl.innerHTML = customPrice.formatted

                if (!customPrice.value) {
                  $checkboxEl.setAttribute('disabled', true)
                  $checkboxEl.setAttribute('style', '')
                }

                $productId.innerHTML = $tempEl.innerHTML

                resolve()
              })
            })
            const showProduct = async page => {
              $results.innerHTML = ''
              const $active = document.querySelector('#more-results .pagination-item--current')
              const $pageItems = document.querySelectorAll('#more-results .pagination-item')
              const $prev = document.querySelector('#more-results .pagination-item--previous')
              const $next = document.querySelector('#more-results .pagination-item--next')
              $active && $active.classList.remove('pagination-item--current')
              $pageItems.length && $pageItems[page].classList.add('pagination-item--current')
              $prev && ($prev.setAttribute('data-page', +page - 1), +page === 1 ? $prev.classList.add('disabled') : $prev.classList.remove('disabled'))
              $next && ($next.setAttribute('data-page', +page + 1), +page === totalPages ? $next.classList.add('disabled') : $next.classList.remove('disabled'))

              const currentPageProduct = productIds
                .filter((productIdItem, i) => i >= (page - 1) * limit && i < page * limit)
              if (currentPageProduct.length) $results.innerHTML = ` <div  class="product-qty-label form-label" style="text-align: right" >${this.text['shopping.list.qty']}<small>*</small></div>`
              // currentPageProduct.map(({ id }) => searchProduct(id))
              await Promise.all(currentPageProduct.map(({ id }) => searchProduct(id)))

              const $searchResults = document.querySelectorAll('#product_search_results [product-search-result-table]');

              for (const $searchResultItem of Array.from($searchResults)) {
                const $inputEl = $searchResultItem.querySelector('input.form-input')
                
                $inputEl.addEventListener('input', async (e) => {
                  const $skuEL = $searchResultItem.querySelector('[data-product-sku]')
                  const $formEl = $searchResultItem.querySelector('[data-option-form]')
                  const $priceEl = $searchResultItem.querySelector('[data-product-price]')
                  const sku = $skuEL?.textContent?.slice(5)
                  const newQty = +e.target.value

                  if ($formEl.checkValidity() === false || newQty === 0) return

                  const newPrice = await getCustomerSpecificPrice(sku, newQty ?? 1)

                  $priceEl.innerHTML = newPrice.formatted;
                })
              }
            }

            showProduct(1)

            window.B3Paginator.init({
              container: '#more-results',
              currentPage,
              totalPages,
              onPageChange: showProduct,
            })
          })
        })
      } else if (searchQuery.length === 0) {
        $results.innerHTML = ''
      }
    }
    if ($btn) $btn.addEventListener('click', handleSearch)
    if ($input) {
      $input.addEventListener('keydown', e => {
        if (e.keyCode === 13) {
          handleSearch()
        }
      })
    }
  }

  instance.bindSkuSearch = function bindSkuSearch() {
    const $skuSearch = document.querySelector('#search_skus')
    const $input = document.querySelector('#product_search_skus')
    const $resultContainer = document.querySelector('#skus_search_results')

    const searchSkuHandler = async () => {
      const searchValue = $input.value
      const variantSku = searchValue.split(',').map(sku => (sku.replace(/^\s*|\s*$/g, '')))

      window.B3Spinner.show()
      try {
        const resp = await this.api.getProductsBySkuQuick({
          variantSku,
        })
        const productIds = []
        const products = resp.filter(({ modifiers }) => !modifiers.length)

        const purchasableProducts = products.filter(({ purchasingDisabled }) => !(purchasingDisabled * 1))

        const result = purchasableProducts.map((product, idx) => {
          const {
            option,
            productId,
            calculatedPrice,
          } = product
          const optionsList = option.map(({
            optionId,
            id,
          }) => ({
            option_id: `attribute[${optionId}]`,
            option_value: id,
          }))

          const imgId = `img_id_${productId}_${idx}`

          productIds.push({
            productId,
            itemId: productId,
            optionsList,
            imgId,
            basePrice: calculatedPrice.value,
          })
          return {
            ...product,
            optionsList: JSON.stringify(optionsList),
            idx,
          }
        })

        const resultContent = this.tpls.skuSearchResultTemplate({
          result,
          searchValue,
        })

        $resultContainer.innerHTML = resultContent

        await this.setProductInfo(productIds)

        const $searchResults = $resultContainer.querySelectorAll('[product-search-result-table]');

        for (const $searchResultItem of Array.from($searchResults)) {
          const $inputEl = $searchResultItem.querySelector('input.form-input')
          
          $inputEl.addEventListener('input', async (e) => {
            const sku = e.target.dataset.advqtySku
            const newQty = +e.target.value
            const newPrice = await getCustomerSpecificPrice(sku, newQty ?? 1)

            if (!newQty) return

            const $priceEl = $searchResultItem.querySelector('.product-price')
            $priceEl.innerHTML = newPrice.formatted;
          })
        }
      } catch {
        this.utils.Alert.error(this.locales.tips.globalError)
      }
      window.B3Spinner.hide()
    }

    if ($skuSearch) {
      $skuSearch.addEventListener('click', searchSkuHandler)
    }

    if ($input) {
      $input.addEventListener('keydown', e => {
        if (e.keyCode === 13) {
          searchSkuHandler()
        }
      })
    }
  }

  instance.bindUploadCSV = function bindUploadCSV() {
    const $CSV = document.querySelector('#customer_sku_csv')
    if ($CSV) {
      $CSV.addEventListener('change', e => {
        const { target } = e
        const reg = new RegExp('[.](csv)$')
        let uploadFile
        let originArr = []
        let errorCounter = 0
        const parsedata = []
        const $csvCheckInfoContainer = document.querySelector('#csv_check_info')

        if (target.files && target.files[0]) {
          [uploadFile] = target.files
        } else {
          return false
        }

        if (!reg.test(uploadFile.name)) {
          return this.utils.Alert.error(this.locales.validation.uploadNotCsv)
        }

        const reader = new FileReader()

        reader.addEventListener('load', async b => {
          const csvdata = b.target.result
          $csvCheckInfoContainer.innerHTML = `<p class="checking-tips">${this.text['qop.checking.file']}</p>`

          window.B3Spinner.show()

          if (csvdata) {
            originArr = csvdata.split('\n')
          }

          this.removeEmptyRow(originArr)
          const unEmptyArr = originArr

          let columns = 0

          if (unEmptyArr && unEmptyArr.length > 0) {
            if (unEmptyArr.length > 300) {
              $csvCheckInfoContainer.innerHTML = `<div class="checking-info-box">${this.text['shopping.list.upload.limit.errorMessage']}</div>`
              window.B3Spinner.hide()
              $CSV.value = ''
              return null
            }

            const headerRow = unEmptyArr[0]
            const headerArr = headerRow.split(',')
            // ["variant_sku", "qty", "options", "", ""]
            this.removeEmptyRow(headerArr)
            columns = headerArr.length
          } else {
            $csvCheckInfoContainer.innerHTML = `<div class="checking-info-box">${this.text['shopping.list.upload.errorMessage']}</div>`
            window.B3Spinner.hide()
            $CSV.value = ''
            return null
          }
          for (let i = 1; i < unEmptyArr.length; i += 1) {
            const productIdsArr = ''
            const dataItem = unEmptyArr[i].split(',')

            this.removeEmptyRow(dataItem)

            let errorInfo = ''
            if (dataItem.length > columns) {
              errorInfo += this.text['qop.redundant.data']
            } else {
              dataItem.length = columns
            }
            if (!dataItem[0]) {
              errorInfo += this.text['qop.empty.sku']
            }
            if (!(dataItem[1]).replace(/[\r\n]/g, '') || (dataItem[1]).replace(/[\r\n]/g, '') === '0') {
              errorInfo += this.text['qop.empty.qty']
            }
            if (/\./.test(dataItem[1]) || /\\-/.test(dataItem[1])) {
              errorInfo += this.text['qop.integer.qty']
            }
            if (errorInfo.trim() !== '') {
              errorCounter += 1
              const el = document.createElement('div')
              el.innerHTML = `${this.utils.text('qop.row.errorInfo', {
                hash: {
                  index: i + 1,
                  errorInfo,
                },
              })}`
              $csvCheckInfoContainer.append(el)
            }
            const productDataArr = productIdsArr.concat(dataItem)
            parsedata.push(productDataArr)
          }

          if (errorCounter === 0) {
            // advQty check
            const csvdataArr = parsedata.map(item => ({
              sku: item.split(',')[0],
              qty: Number.parseInt(item.split(',')[1], 10),
            }))
            const keywords = []
            parsedata.forEach(item => {
              keywords.push(item.split(',')[0])
            })
            let variantSkus = []
            const newData = []
            csvdataArr.forEach(item => {
              variantSkus.push(item.sku)
            })
            variantSkus = Array.from(new Set(variantSkus))

            const customPrices = await getAcumaticaPrices(csvdataArr)
            const itemsWithoutPrices = csvdataArr.filter(item => !customPrices[item.sku].value)

            if (itemsWithoutPrices.length) {
              let errorMessage = 'The prices for the following SKUs does not exist in our '
              errorMessage += 'database. Please remove the following SKUs from the CSV:\n\n'
              errorMessage += itemsWithoutPrices.map(item => item.sku).join('\n')

              this.utils.Alert.error(errorMessage)
              window.B3Spinner.hide()

              const el = document.createElement('div')
              el.innerHTML = `<div style="font-weight:600;">Detected Invalid SKUs</div>`
              $csvCheckInfoContainer.append(el)
              $csvCheckInfoContainer.querySelector('.checking-tips').remove()
              $CSV.value = ''

              return
            }

            this.api.getProductsBySkuQuickByPost({ variantSkus }).then(res => {
              res.forEach(item => {
                csvdataArr.forEach(cItem => {
                  if (item.variantSku === cItem.sku && !(item.purchasingDisabled * 1)) {
                    newData.push([
                      item.productId,
                      item.variantId,
                      item.variantSku,
                      cItem.qty,
                      item.option ? item.option : '',
                    ])
                  }
                })
              })
              if (newData.length > 0) {
                $csvCheckInfoContainer.innerHTML = `<div>${this.text['shopping.list.file.processed']}</div>`

                const itemArr = csvdataArr
                const variantSkus = itemArr.map(item => item.sku)
                const qtyArr = itemArr.map(item => item.qty)

                this.api.getAdvQtyState().then(() => this.api.getAdvQtyBySkusNew({ variantSkus }), () => {
                  $CSV.value = ''
                  this.addCsvProductsToList(newData)
                  return []
                }).then(res => {
                  let invalideQtyCount = 0
                  variantSkus.forEach((sku, idx) => {
                    if (!res.data) {
                      return
                    }
                    const match = res.data.productQuantityList.filter(row => row.variantSku === sku)
                    if (match.length === 0) return
                    const qtyInfo = match[0]
                    const qty = Number.parseInt(qtyArr[idx], 10) || 0
                    const qtyMin = this.getMinQty(qtyInfo.minOrderQty, qtyInfo.qtyIncrement)

                    const qtyIncrement = Number.parseInt(qtyInfo.qtyIncrement, 10) || 1

                    if (qty < qtyMin || (qty % qtyIncrement) !== 0) {
                      invalideQtyCount += 1
                    }
                  })

                  if (invalideQtyCount > 0) {
                    const el = document.createElement('div')
                    el.innerHTML = `<div style="font-weight:600;">${this.text['shopping.list.fileCheck.errorMessage']}</div>`
                    $csvCheckInfoContainer.append(el)
                    $csvCheckInfoContainer.querySelector('.checking-tips').remove()
                  } else {
                    $csvCheckInfoContainer.innerHTML = `<div>${this.text['shopping.list.file.processed']}</div>`
                    $CSV.value = ''
                    this.addCsvProductsToList(newData)
                  }
                }, () => {
                  const el = document.createElement('div')
                  el.innerHTML = `<div style="font-weight:600;">${this.text['shopping.list.fileCheck.errorMessage']}</div>`
                  $csvCheckInfoContainer.append(el)
                  $csvCheckInfoContainer.querySelector('.checking-tips').remove()
                }).catch(error => {
                  this.utils.Alert.error(error)
                })
                .finally(() => $CSV.value = '')
              } else {
                $csvCheckInfoContainer.innerHTML = `<div class="checking-info-box">${this.text['shopping.list.fileProcessed.errorMessage']}</div>`
                window.B3Spinner.hide()
                $CSV.value = ''
              }
              return newData
            })
          } else {
            const el = document.createElement('div')
            el.innerHTML = `${this.utils.text('shopping.list.fileUpload.errorMessage', {
              hash: {
                errorCounter,
              },
            })}`
            $csvCheckInfoContainer.append(el)
            $csvCheckInfoContainer.querySelector('.checking-tips').remove()
            window.B3Spinner.hide()
            $CSV.value = ''
            return parsedata
          }
        })

        return reader.readAsBinaryString(uploadFile)
      })
    }
  }

  instance.bindEditOptions = function bindEditOptions() {
    const {
      editOptionsModal,
    } = this.state

    this.utils.on('#shopping_list_table tbody tr', 'click', 'edit-option', async ($tr, target, e) => {
      e.preventDefault()
      e.stopPropagation()
      const {
        productId,
        variantId,
        index: itemIndex,
        productOptions: itemOptions,
        itemId,
      } = $tr.dataset

      const skuEl = $tr.querySelector('.product-sku')
      const skuHtml = skuEl.innerHTML
      const sku = skuEl.textContent.trim().slice(6)
      const qty = +$tr.querySelector('[data-product-quantity] input').value

      this.setState({
        shopingListItemId: itemId,
      })

      window.B3Spinner.show()

      this.stencilUtils.api.product.getById(productId, {
        template: 'b3/b3json',
      }, async (err, response) => {
        window.B3Spinner.hide()
        if (err) return
        let optionsHTML = ''
        const {
          product = {},
        } = JSON.parse(response) || {}
        optionsHTML = this.renderOptions(product.options, productId)
        this.setState({
          productViewOptionsMap: {
            ...this.state.productViewOptionsMap,
            [productId]: product,
          },
        })

        const modalContent = this.tpls.editOptionsModalTemplate({
          product: {
            ...product,
            ...this.utils.getCorrectProductImage(product, 'main_image'),
            optionsHTML,
          },
        })

        editOptionsModal.open()
        editOptionsModal.setContent(modalContent)
        const $modalContent = editOptionsModal.getContent()

        $modalContent.querySelector('#index_container').dataset.index = itemIndex
        $modalContent.querySelector('#variant_id_container').dataset.variantId = variantId
        $modalContent.querySelector('[data-product-sku]').innerHTML = skuHtml

        const $close = $modalContent.querySelector('.modal-close')
        if ($close) {
          $close.addEventListener('click', () => {
            editOptionsModal.close()
          })
        }

        // renderDefaultOptions
        this.renderDefaultOptions(itemOptions)
        // this.renderEditOptionsPrice(itemOptions, productId, $modalContent)

        const price = await getCustomerSpecificPrice(sku, qty)
        $modalContent.querySelector('[data-product-price-value]').dataset.productPriceValue = price.value
        $modalContent.querySelector('.product-price').textContent = price.formatted

        const $modal = document.querySelector('#option-modal')
        const tr = $modal.querySelector('tr')
        tr.setAttribute('data-variant-id', variantId)
        tr.setAttribute('data-line-qty', qty)
        this.listenOptionChange()
      })
    })
  }
}
