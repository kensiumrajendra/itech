import wrapAddProducts from "../utils/wrap-add-products";

export default function overrideOrders(instance) {
  wrapAddProducts(instance)
}
