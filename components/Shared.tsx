
import React, { useState, useEffect } from 'react';

export const Spinner: React.FC<{ size?: string; color?: string }> = ({ 
  size = "w-5 h-5", 
  color = "border-white" 
}) => (
  <div className={`${size} border-2 ${color} border-t-transparent rounded-full animate-spin`}></div>
);

interface CurrencyInputProps {
  value: string | number;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

/**
 * Helper to convert Persian/Arabic numerals to standard ASCII digits
 */
const convertToEnglishDigits = (str: string): string => {
  const persianDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicDigits = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replace(persianDigits[i], i.toString()).replace(arabicDigits[i], i.toString());
  }
  return result;
};

export const CurrencyInput: React.FC<CurrencyInputProps> = ({ 
  value, 
  onChange, 
  placeholder, 
  className, 
  required 
}) => {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    if (value === '' || value === null || value === undefined) {
      setDisplayValue('');
    } else {
      const numValue = typeof value === 'string' ? parseInt(value) : value;
      if (!isNaN(numValue)) {
        setDisplayValue(numValue.toLocaleString());
      }
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // First, convert any Persian/Arabic digits to English digits
    let input = convertToEnglishDigits(e.target.value);
    
    // Then, remove all non-digit characters
    const rawInput = input.replace(/[^0-9]/g, '');
    
    if (rawInput === '') {
      setDisplayValue('');
      onChange('');
    } else {
      const num = parseInt(rawInput, 10);
      setDisplayValue(num.toLocaleString());
      onChange(rawInput);
    }
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={`${className} pl-12 text-left ltr font-mono focus:ring-2 focus:ring-blue-500 transition-all`}
        style={{ direction: 'ltr' }}
        required={required}
      />
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold pointer-events-none">تومان</span>
    </div>
  );
};
