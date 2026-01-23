/* eslint-disable @typescript-eslint/no-explicit-any */
import { BASE_CLIENT } from "../config";
import { handleApiCall } from "../config/utils";

// --- Types ---

// --- API Definition ---

export const paymentDetailsApi = {
  get_paymentDetails: async ({
    identifier,
  }: {
    identifier: string;
  }): Promise<any> => {
    const url = `/v1/pay/${identifier}`;
    const res = await handleApiCall(
      () => BASE_CLIENT.get(url),
      "get_paymentDetails",
    );
    return res.data;
  },
};
