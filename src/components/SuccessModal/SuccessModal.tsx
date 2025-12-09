import React from "react";
import styles from "./SuccessModal.module.css";
import LargeCheckIcon from "@/assets/LargeCheckIcon";
import CloseIcon from "@/assets/CloseIcon";
import CopyIcon from "@/assets/Copy";
import ExternalLinkIcon from "@/assets/ExternalLinkIcon";
import Button from "../Button/Button";
import DownloadIcon from "@/assets/DownloadIcon";
import { Modal } from "../Modal/Modal";
import { Copy } from "../Copy/Copy";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  network: string;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  amount,
  network,
}) => {
  if (!isOpen) return null;

  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <button className={styles.closeBtn} onClick={onClose}>
            <CloseIcon />
          </button>
          <div className={styles.successIcon}>
            <div className={styles.checkmarkCircle}>
              <LargeCheckIcon />
            </div>
          </div>
          <h2 className={styles.successTitle}>Payment Successful</h2>
          <p className={styles.successSubtitle}>Thank you for your purchase!</p>
          <div className={styles.successAmount}>{amount.toFixed(1)} USDT</div>
          <div className={styles.transactionDetails}>
            <div className={styles.detailsWrapper}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Amount Paid</span>
                <span className={styles.detailValue}>
                  {(amount - 2.5).toFixed(0)} USDC
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Network</span>
                <span className={styles.detailValue}>{network}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Date & Time</span>
                <span className={styles.detailValue}>Dec 2, 2025 04:12 PM</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>From</span>
                <span className={styles.detailValue}>0x8444...F3E</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>To</span>
                <span className={styles.detailValue}>0x3264...34W</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Transaction Hash</span>
              </div>
            </div>
            <div className={styles.hashValue}>
              5Uj6E5fAvKgzpnN7SfbU4aM4G5oSE5Cv7eA0Hbgzp4U0
              <Copy
                text="5Uj6E5fAvKgzpnN7SfbU4aM4G5oSE5Cv7eA0Hbgzp4U0"
                color="#474747"
              />
            </div>
            <a href="#" className={styles.explorerLink}>
              View on Explorer <ExternalLinkIcon />
            </a>
          </div>
          <div className={styles.successActions}>
            <Button
              variant="secondary"
              className={styles.closeModalBtn}
              onClick={onClose}
            >
              Close
            </Button>
            <Button variant="primary" className={styles.downloadBtn}>
              <DownloadIcon /> Download Receipt
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
