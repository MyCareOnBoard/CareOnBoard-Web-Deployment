import React from "react";

interface ContentEditableCellProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

const ContentEditableCell: React.FC<ContentEditableCellProps> = ({
  value,
  onChange,
  className = "",
  placeholder = "",
}) => {
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    onChange(e.currentTarget.textContent || "");
  };

  return (
    <div
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      className={`w-full min-h-[71px] border-0 bg-transparent text-center focus:outline-none text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif] py-6 ${className}`}
      dangerouslySetInnerHTML={{ __html: value }}
      data-placeholder={placeholder}
    />
  );
};

export default ContentEditableCell;

