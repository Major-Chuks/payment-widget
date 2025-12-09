import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import styles from "./QRCodeModal.module.css";
import qrcodeImage from "@/assets/qrcode-image.png";
import Image from "next/image";
import CloseIcon from "@/assets/CloseIcon";
import PhoneIcon from "@/assets/PhoneIcon";

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrCodeUrl?: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  open,
  onOpenChange,
  qrCodeUrl = "https://example.com/checkout",
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content}>
          <Dialog.Close className={styles.closeButton}>
            <CloseIcon />
          </Dialog.Close>

          <div>
            <Dialog.Title className={styles.title}>
              Pay with QR Code
            </Dialog.Title>

            <Dialog.Description className={styles.description}>
              Scan to continue payment on your mobile wallet
            </Dialog.Description>
          </div>

          <div className={styles.qrCodeContainer}>
            <Image src={qrcodeImage} alt="" />
          </div>

          <div className={styles.instruction}>
            <PhoneIcon />
            Open camera app to scan
          </div>

          <div className={styles.footer}>
            This QR code will open the checkout page on your mobile device with
            WalletConnect
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
