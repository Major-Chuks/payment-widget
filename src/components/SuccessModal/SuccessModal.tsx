import React, { useRef, useState } from "react";
import styles from "./SuccessModal.module.css";
import LargeCheckIcon from "@/assets/LargeCheckIcon";
import CloseIcon from "@/assets/CloseIcon";
import ExternalLinkIcon from "@/assets/ExternalLinkIcon";
import Button from "../Button/Button";
import DownloadIcon from "@/assets/DownloadIcon";
import { Modal } from "../Modal/Modal";
import { Copy } from "../Copy/Copy";
import { formatAddress } from "@/utils";
import { toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";

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
  const modalRef = useRef<HTMLDivElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadReceipt = async () => {
    if (modalRef.current === null) return;

    setIsDownloading(true);

    // Wait for the state to update and re-render
    // Wait for the state to update and re-render
    setTimeout(async () => {
      try {
        const dataUrl = await toJpeg(modalRef.current!, {
          cacheBust: true,
          pixelRatio: 2, // Good balance of quality and size
          quality: 0.95,
          backgroundColor: "#ffffff", // Ensure white background for JPEG
        });

        // Calculate dimensions
        const modalRect = modalRef.current!.getBoundingClientRect();
        const linkRect = linkRef.current?.getBoundingClientRect();

        const modalWidth = modalRect.width;
        const modalHeight = modalRect.height;

        // Define target width in points (e.g. 380pt is decent for a receipt)
        // A4 is 595.28pt wide
        const pdfTargetWidth = 380;
        const scaleFactor = pdfTargetWidth / modalWidth;
        const pdfTargetHeight = modalHeight * scaleFactor;

        const doc = new jsPDF({
          orientation: "portrait",
          unit: "pt",
          format: "a4",
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const xOffset = (pageWidth - pdfTargetWidth) / 2;
        const yOffset = (pageHeight - pdfTargetHeight) / 2;

        doc.addImage(
          dataUrl,
          "JPEG",
          xOffset,
          yOffset,
          pdfTargetWidth,
          pdfTargetHeight
        );

        // Add clickable area if linkRef exists
        if (linkRect) {
          const relativeX = linkRect.left - modalRect.left;
          const relativeY = linkRect.top - modalRect.top;

          const x = xOffset + relativeX * scaleFactor;
          const y = yOffset + relativeY * scaleFactor;
          const w = linkRect.width * scaleFactor;
          const h = linkRect.height * scaleFactor;

          // IMPORTANT: link to whatever the href is
          const href = linkRef.current?.getAttribute("href") || "#";

          doc.link(x, y, w, h, { url: href });
        }

        doc.save(`receipt-${Date.now()}.pdf`);
      } catch (err) {
        console.error("Failed to download receipt", err);
      } finally {
        setIsDownloading(false);
      }
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div
          ref={modalRef}
          className={styles.modal}
          onClick={(e) => e.stopPropagation()}
        >
          {!isDownloading && (
            <button className={styles.closeBtn} onClick={onClose}>
              <CloseIcon />
            </button>
          )}
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
              {isDownloading
                ? "5Uj6E5fAvKgzpnN7SfbU4aM4G5oSE5Cv7eA0Hbgzp4U0"
                : formatAddress("5Uj6E5fAvKgzpnN7SfbU4aM4G5oSE5Cv7eA0Hbgzp4U0")}
              {!isDownloading && (
                <Copy
                  text="5Uj6E5fAvKgzpnN7SfbU4aM4G5oSE5Cv7eA0Hbgzp4U0"
                  color="#474747"
                />
              )}
            </div>
            <a href="#" className={styles.explorerLink} ref={linkRef}>
              View on Explorer <ExternalLinkIcon />
            </a>
          </div>
          {!isDownloading && (
            <div className={styles.successActions}>
              <Button
                variant="secondary"
                className={styles.closeModalBtn}
                onClick={onClose}
              >
                Close
              </Button>
              <Button
                variant="primary"
                className={styles.downloadBtn}
                onClick={handleDownloadReceipt}
              >
                <DownloadIcon /> Download Receipt
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
