/* eslint-disable @next/next/no-img-element */
import React from "react";
import * as Select from "@radix-ui/react-select";
import styles from "./DropdownSelector.module.css";
import ChevronDown from "@/assets/ChevronDown";
import CheckIcon from "@/assets/CheckIcon";

export interface SelectorOption {
  id: string;
  name: string;
  subtitle?: string;
  icon: string;
  balance?: number;
  symbol?: string;
}

interface DropdownSelectorProps {
  options: SelectorOption[];
  selectedOption: SelectorOption;
  onSelect: (option: SelectorOption) => void;
  label: string;
}

export const DropdownSelector: React.FC<DropdownSelectorProps> = ({
  options,
  selectedOption,
  onSelect,
  label,
}) => {
  const handleValueChange = (value: string) => {
    const option = options.find((opt) => opt.id === value);
    if (option) {
      onSelect(option);
    }
  };

  return (
    <div className={styles.selectorSection}>
      <label className={styles.sectionLabel}>{label}</label>
      <Select.Root value={selectedOption.id} onValueChange={handleValueChange}>
        <Select.Trigger className={styles.selector}>
          <div className={styles.selectorContent}>
            <img className={styles.icon} src={selectedOption.icon} alt="" />
            <div className={styles.info}>
              <div className={styles.name}>{selectedOption.name}</div>
              {selectedOption.subtitle && (
                <div className={styles.subtitle}>{selectedOption.subtitle}</div>
              )}
            </div>
          </div>
          <Select.Icon className={styles.dropdownArrow}>
            <ChevronDown color="#7D828D" />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content
            className={styles.dropdownMenu}
            position="popper"
            sideOffset={12}
          >
            <Select.Viewport>
              {options.map((option) => (
                <Select.Item
                  key={option.id}
                  value={option.id}
                  className={`${styles.dropdownItem} ${
                    selectedOption.id === option.id ? styles.selected : ""
                  }`}
                >
                  <img className={styles.icon} src={option.icon} alt="" />
                  <div className={styles.info}>
                    <Select.ItemText>
                      <div className={styles.name}>{option.name}</div>
                    </Select.ItemText>
                    {option.subtitle && (
                      <div className={styles.subtitle}>{option.subtitle}</div>
                    )}
                  </div>
                  {selectedOption.id === option.id && (
                    <span className={styles.checkmark}>
                      <CheckIcon />
                    </span>
                  )}
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
};
