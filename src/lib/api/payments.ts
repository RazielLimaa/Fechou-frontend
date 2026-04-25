import * as paymentService from "../../service/payment";

export type {
  CancelSubscriptionResponse,
  ConfirmSubscriptionResponse,
  PaymentsMeResponse,
  PlanId,
  PlanInfo,
  SubscriptionCheckoutResponse,
  SubscriptionInfo,
} from "../../service/payment";

export {
  cancelSubscription,
  confirmSubscription,
  confirmSubscriptionCheckout,
  createSubscriptionCheckout,
  createSubscriptionCheckoutLegacy,
  getBillingMe,
  getMyPlan,
} from "../../service/payment";

export const paymentsApi = {
  getBillingMe: paymentService.getBillingMe,
  getMyPlan: paymentService.getMyPlan,
  createSubscriptionCheckout: paymentService.createSubscriptionCheckout,
  confirmSubscription: paymentService.confirmSubscription,
  cancelSubscription: paymentService.cancelSubscription,
};

