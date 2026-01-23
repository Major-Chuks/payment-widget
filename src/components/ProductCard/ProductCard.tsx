/* eslint-disable @next/next/no-img-element */
import React from "react";
import styles from "./ProductCard.module.css";
import xIcon from "@/assets/x-icon.svg";
import Image from "next/image";
import Button from "../Button/Button";
import { Copy } from "../Copy/Copy";
import { formatAddress } from "@/utils";

import useEmblaCarousel from "embla-carousel-react";
import { ProductImage } from "@/api-services/types/general/get_paymentDetails";
import { useState, useEffect, useCallback } from "react";

interface ProductCardProps {
  recipient: string;
  title: string;
  description: string;
  images: ProductImage[];
}

export const ProductCard: React.FC<ProductCardProps> = ({
  recipient,
  title,
  description,
  images,
}) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    // Force re-init if needed when images change, usually auto-handled but safe to know
  }, [emblaApi, onSelect]);

  const hasMultipleImages = images && images.length > 1;

  return (
    <div className={styles.productCard}>
      <div className={styles.recipient}>
        <span className={styles.recipientLabel}>Recipient</span>
        <div className={styles.recipientAddress}>
          {recipient ? (
            <>
              {formatAddress(recipient)}
              <Copy text={recipient} color="#6148C2" />
            </>
          ) : (
            <span>Select a network</span>
          )}
        </div>
      </div>

      <h2 className={styles.productTitle}>{title}</h2>
      <p className={styles.productLink}>{description}</p>

      {/* Image Section */}
      <div className={styles.imageContainer}>
        {hasMultipleImages ? (
          <div className={styles.embla} ref={emblaRef}>
            <div className={styles.emblaContainer}>
              {images.map((img) => (
                <div className={styles.emblaSlide} key={img.id}>
                  <img
                    src={img.url}
                    alt={title}
                    className={styles.productImage}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <img
            src={images?.[0]?.url || ""}
            alt={title}
            className={styles.productImage}
          />
        )}

        {/* Carousel Dots */}
        {hasMultipleImages && (
          <div className={styles.dotsContainer}>
            {images.map((_, index) => (
              <button
                key={index}
                className={`${styles.dot} ${index === selectedIndex ? styles.dotActive : ""
                  }`}
                onClick={() => emblaApi?.scrollTo(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className={styles.cardFooter}>
        <Button className={styles.reportLink}>Report description</Button>
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
