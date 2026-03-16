import { useEffect } from "react";
import { publicPaymentsApi } from "@/api-services/definitions/publicPayments";

interface UsePaymentPollingProps {
  showStatusModal: boolean;
  paymentStatus: string;
  gatewayPaymentId?: string;
  onSuccess: (txHash?: string) => void;
  onFail: (error?: string | null, txHash?: string) => void;
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
            onSuccess(result.tx_hash ?? undefined);
          } else if (result.status === "failed") {
            onFail(result.error, result.tx_hash ?? undefined);
          }
        } catch (error) {
          console.error("Background polling error:", error);
        }
      }, 5000);
    }

    return () => clearInterval(intervalId);
  }, [showStatusModal, paymentStatus, gatewayPaymentId, onSuccess, onFail]);
};
