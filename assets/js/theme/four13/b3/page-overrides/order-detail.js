import wrapAddProducts from "../utils/wrap-add-products"

export default function overrideOrderDetail(instance) {
  wrapAddProducts(instance)
}
