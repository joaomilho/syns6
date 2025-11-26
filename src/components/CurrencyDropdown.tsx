"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./CurrencyDropdown.module.css";

export type CurrencyCode = 'AED' | 'ARS' | 'AUD' | 'BRL' | 'CAD' | 'CHF' | 'CLP' | 'CNY' | 'DKK' | 'EUR' | 'GBP' | 'HKD' | 'IDR' | 'ILS' | 'INR' | 'ISK' | 'JPY' | 'KRW' | 'MXN' | 'MYR' | 'NGN' | 'NOK' | 'PKR' | 'PLN' | 'RUB' | 'SEK' | 'SGD' | 'THB' | 'TRY' | 'TWD' | 'UAH' | 'USD' | 'UYU' | 'ZAR';

interface CurrencyOption {
  code: CurrencyCode;
  name: string;
  symbol: string;
}

const currencies: CurrencyOption[] = [
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: '$' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: '$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: '$' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'ISK', name: 'Icelandic Króna', symbol: 'kr' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
  { code: 'PLN', name: 'Polish Złoty', symbol: 'zł' },
  { code: 'RUB', name: 'Russian Ruble', symbol: 'р.' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: '$' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'TRY', name: 'Turkish Lira', symbol: 'TL' },
  { code: 'TWD', name: 'Taiwan Dollar', symbol: '$' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'UYU', name: 'Uruguayan Peso', symbol: '$' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
];

interface CurrencyDropdownProps {
  value: CurrencyCode;
  onChange: (value: CurrencyCode) => void;
}

export default function CurrencyDropdown({ value, onChange }: CurrencyDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentCurrency = currencies.find((c) => c.code === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (code: CurrencyCode) => {
    onChange(code);
    setIsOpen(false);
    setSearchQuery("");
  };

  const filteredCurrencies = currencies.filter(
    (currency) =>
      currency.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      currency.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.dropdown} ref={dropdownRef}>
      <button
        className={styles.dropdownButton}
        onClick={() => setIsOpen(!isOpen)}
        title="Select Currency"
      >
        <span className={styles.icon}>{currentCurrency?.symbol}</span>
        <span className={styles.label}>{currentCurrency?.code}</span>
        <span className={styles.arrow}>{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu}>
          <div className={styles.menuHeader}>Select Currency</div>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search currencies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          <div className={styles.currencyList}>
            {filteredCurrencies.map((currency) => (
              <button
                key={currency.code}
                className={`${styles.currencyOption} ${
                  currency.code === value ? styles.active : ""
                }`}
                onClick={() => handleSelect(currency.code)}
              >
                <div className={styles.currencySymbol}>{currency.symbol}</div>
                <div className={styles.currencyInfo}>
                  <div className={styles.currencyCode}>{currency.code}</div>
                  <div className={styles.currencyName}>{currency.name}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

