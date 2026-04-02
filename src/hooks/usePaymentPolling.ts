import { useEffect } from "react";
import { publicPaymentsApi } from "@/api-services/definitions/publicPayments";

interface UsePaymentPollingProps {
  showStatusModal: boolean;
  paymentStatus: string;
  gatewayPaymentId?: string;
  onSuccess: ({ txHash, explorerUrl }: { txHash: string, explorerUrl: string }) => void;
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

          console.log({ result });
          if (result.status === "confirmed") {
            onSuccess({ txHash: result.tx_hash ?? "", explorerUrl: result.explorer_url ?? "" });
          } else if (result.status === "failed") {
            onFail(result.error, result.tx_hash ?? "");
          }
        } catch (error) {
          console.error("Background polling error:", error);
        }
      }, 5000);
    }

    return () => clearInterval(intervalId);
  }, [showStatusModal, paymentStatus, gatewayPaymentId, onSuccess, onFail]);
};
