import React from "react";
import styles from "./PaymentStatusModal.module.css";
import CloseIcon from "@/assets/CloseIcon";
import WarningIcon from "@/assets/WarningIcon";
import Button from "../Button/Button";
import * as Dialog from "@radix-ui/react-dialog";
import { formatAddress } from "@/utils";
import { Copiable } from "../Copiable/Copiable";

type PaymentStatus = "submitted" | "pending" | "confirmed" | "failed";

interface PaymentStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRetry?: () => void;
    status: PaymentStatus;
    transactionRef?: string;
    gatewayPaymentId?: string;
    error?: string | null;
}

const statusConfig: Record<
    PaymentStatus,
    { title: string; subtitle: string; variant: string }
> = {
    submitted: {
        title: "Payment Submitted",
        subtitle: "Your transaction has been submitted and is being processed.",
        variant: "submitted",
    },
    pending: {
        title: "Payment Pending",
        subtitle: "Your transaction is being confirmed on the network.",
        variant: "pending",
    },
    confirmed: {
        title: "Payment Confirmed",
        subtitle: "Your payment has been confirmed successfully!",
        variant: "submitted",
    },
    failed: {
        title: "Payment Failed",
        subtitle: "There was an issue processing your payment.",
        variant: "failed",
    },
};

export const PaymentStatusModal: React.FC<PaymentStatusModalProps> = ({
    isOpen,
    onClose,
    onRetry,
    status,
    transactionRef,
    gatewayPaymentId,
    error,
}) => {
    if (!isOpen) return null;

    const config = statusConfig[status];
    const isFailed = status === "failed";
    const isProcessing = status === "submitted" || status === "pending";

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className={styles.modalOverlay} />
                <Dialog.Content
                    className={styles.modal}
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <button className={styles.closeBtn} onClick={onClose}>
                        <CloseIcon />
                    </button>

                    <div className={styles.statusIcon}>
                        {isFailed ? (
                            <div className={`${styles.iconCircle} ${styles.failed}`}>
                                <WarningIcon width={48} height={48} />
                            </div>
                        ) : (
                            <div
                                className={`${styles.iconCircle} ${styles[config.variant]}`}
                            >
                                <div
                                    className={`${styles.spinner} ${styles[config.variant]}`}
                                />
                            </div>
                        )}
                    </div>

                    <Dialog.Title className={styles.title}>{config.title}</Dialog.Title>
                    <Dialog.Description className={styles.subtitle}>{config.subtitle}</Dialog.Description>

                    <div
                        className={`${styles.statusBadge} ${styles[config.variant]}`}
                    >
                        <span>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                    </div>

                    <div className={styles.detailsSection}>
                        <div className={styles.detailsWrapper}>
                            {gatewayPaymentId && (
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Payment ID</span>
                                    <Copiable text={gatewayPaymentId}>
                                        <span className={styles.detailValue}>
                                            {formatAddress(gatewayPaymentId)}
                                        </span>
                                    </Copiable>
                                </div>
                            )}
                            {transactionRef && (
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Reference</span>
                                    <Copiable text={transactionRef}>
                                        <span className={styles.detailValue}>
                                            {formatAddress(transactionRef)}
                                        </span>
                                    </Copiable>
                                </div>
                            )}
                            {error && (
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Error</span>
                                    <span className={styles.detailValue}>{error}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <Button
                            variant="secondary"
                            className={styles.closeModalBtn}
                            onClick={onClose}
                        >
                            Close
                        </Button>
                        {isFailed && onRetry && (
                            <Button variant="primary" onClick={onRetry}>
                                Retry Payment
                            </Button>
                        )}
                        {isProcessing && (
                            <Button variant="primary" disabled>
                                Processing...
                            </Button>
                        )}
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
