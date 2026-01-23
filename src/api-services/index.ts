export * from "./config";
export * from "./config/utils";

import { paymentDetailsApi } from "./definitions/paymentDetails";

export const apiClient = {
  ...paymentDetailsApi,
};
