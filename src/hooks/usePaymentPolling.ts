import { useEffect } from "react";
import { publicPaymentsApi } from "@/api-services/definitions/publicPayments";
import { get_checkPaymentStatus } from "@/api-services/types/publicPayments/get_checkPaymentStatus";

interface UsePaymentPollingProps {
  showStatusModal: boolean;
  paymentStatus: string;
  gatewayPaymentId?: string;
  onSuccess: (result: get_checkPaymentStatus) => void;
  onFail: (error?: string , tx_hash?: string ) => void;
}

export const usePaymentPolling = ({
  showStatusModal,
  paymentStatus,
  gatewayPaymentId,
  onSuccess,
  onFail,
}: UsePaymentPollingProps) => {
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (
      showStatusModal &&
      (paymentStatus === "submitted" || paymentStatus === "pending") &&
      gatewayPaymentId
    ) {
      intervalId = setInterval(async () => {
        try {
          const result =
            await publicPaymentsApi.get_checkPaymentStatus(gatewayPaymentId);
          if (result.status === "confirmed") {
            onSuccess(result);
          } else if (result.status === "failed") {
            onFail(result.error ?? "", result.tx_hash ?? "");
          }
        } catch (error) {
          console.error("Background polling error:", error);
        }
      }, 5000);
    }

    return () => clearInterval(intervalId);
  }, [showStatusModal, paymentStatus, gatewayPaymentId, onSuccess, onFail]);
};
