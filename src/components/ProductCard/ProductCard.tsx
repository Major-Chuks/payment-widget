/* eslint-disable @next/next/no-img-element */
import React from "react";
import styles from "./ProductCard.module.css";
import CopyIcon from "@/assets/Copy";
import xIcon from "@/assets/x-icon.svg";
import Image from "next/image";
import Button from "../Button/Button";
import { Copy } from "../Copy/Copy";

interface ProductCardProps {
  recipient: string;
  title: string;
  link: string;
  imageUrl: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  recipient,
  title,
  link,
  imageUrl,
}) => {
  return (
    <div className={styles.productCard}>
      <div className={styles.recipient}>
        <span className={styles.recipientLabel}>Recipient</span>
        <div className={styles.recipientAddress}>
          {recipient}
          <Copy text="" color="#6148C2" />
        </div>
      </div>

      <h2 className={styles.productTitle}>{title}</h2>
      <p className={styles.productLink}>{link}</p>

      <img src={imageUrl} alt={title} className={styles.productImage} />

      <div className={styles.cardFooter}>
        <Button className={styles.reportLink}>Report link</Button>
        <Button className={styles.shareLink}>
          Share on{" "}
          <span className={styles.xIcon}>
            <Image src={xIcon} alt="" />
          </span>
        </Button>
      </div>
    </div>
  );
};
