// Generated file - DO NOT EDIT
// This file contains React Query hooks for general API

import { paymentDetailsApi } from "../definitions/paymentDetails";
import { useApiQuery } from ".";

export const useGetPaymentDetailsQuery = (
  params: { identifier: string },
  options?: Parameters<typeof useApiQuery>[2],
) =>
  useApiQuery(
    ["get_healthCheck", JSON.stringify(params)],
    () => paymentDetailsApi.get_paymentDetails(params),
    options,
  );
