/* eslint-disable @next/next/no-img-element */
import React from "react";
import * as Select from "@radix-ui/react-select";
import styles from "./CountryDropdown.module.css";
import { COUNTRY } from "@/constants/country";
import ChevronDown from "@/assets/ChevronDown";

interface CountryDropdownProps {
    value: string;
    onChange: (value: string) => void;
    label: string;
    placeholder?: string;
    required?: boolean;
}

export const CountryDropdown: React.FC<CountryDropdownProps> = ({
    value,
    onChange,
    label,
    placeholder = "Select Country",
    required = false,
}) => {
    return (
        <div className={styles.formGroup}>
            <label className={styles.label}>
                {label} {required && "*"}
            </label>
            <Select.Root value={value} onValueChange={onChange}>
                <Select.Trigger className={styles.select}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {value ? (
                            <>
                                <img
                                    src={COUNTRY.find((c) => c.name === value)?.flag}
                                    alt=""
                                    className={styles.flag}
                                />
                                <span>{value}</span>
                            </>
                        ) : (
                            <span style={{ color: "var(--Grey-500, #7d828d)" }}>
                                {placeholder}
                            </span>
                        )}
                    </div>
                    <Select.Icon className={styles.selectIcon}>
                        <ChevronDown />
                    </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                    <Select.Content className={styles.selectContent} position="popper" sideOffset={5}>
                        <Select.Viewport>
                            {COUNTRY.map((country) => (
                                <Select.Item
                                    key={country.country_code} // Using ISO-3 code as key
                                    value={country.name} // Storing Name as value, can change to code if backend needs
                                    className={styles.selectItem}
                                >
                                    <img
                                        src={country.flag}
                                        alt={`${country.name} flag`}
                                        className={styles.flag}
                                    />
                                    <Select.ItemText>{country.name}</Select.ItemText>
                                </Select.Item>
                            ))}
                        </Select.Viewport>
                    </Select.Content>
                </Select.Portal>
            </Select.Root>
        </div>
    );
};
