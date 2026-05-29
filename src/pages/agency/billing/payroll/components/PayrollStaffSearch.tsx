import { useEffect, useRef, useState } from "react";

type PayrollStaffSearchProps = {
  onFilterChange: (query: string) => void;
};

export default function PayrollStaffSearch({ onFilterChange }: PayrollStaffSearchProps) {
  const [query, setQuery] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full lg:w-[320px]">
      <div className="flex h-11 items-center rounded-xl border border-[#cccccd] bg-white px-4">
        <input
          type="text"
          value={query}
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);

            if (searchTimeoutRef.current) {
              clearTimeout(searchTimeoutRef.current);
            }

            searchTimeoutRef.current = setTimeout(() => {
              onFilterChange(value);
            }, 300);
          }}
          placeholder="Search staff name"
          className="flex-1 bg-transparent text-[14px] font-normal text-black outline-none placeholder:text-[#b2b2b3]"
        />
      </div>
    </div>
  );
}
