import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";
import type { OperationalClientOption } from "@/lib/operational-agency/types";

type ClaimsClientSearchProps = {
  onFilterChange: (query: string, selectedClientName?: string) => void;
};

export default function ClaimsClientSearch({ onFilterChange }: ClaimsClientSearchProps) {
  const { agencyId, mode, data } = useOperationalAgency();
  const [query, setQuery] = useState("");
  const [clientSearchResults, setClientSearchResults] = useState<OperationalClientOption[]>([]);
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const clientSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (clientSearchTimeoutRef.current) {
        clearTimeout(clientSearchTimeoutRef.current);
      }
      searchControllerRef.current?.abort();
    };
  }, []);

  const handleClientSearch = useCallback(
    async (searchQuery: string) => {
      if (clientSearchTimeoutRef.current) {
        clearTimeout(clientSearchTimeoutRef.current);
      }
      searchControllerRef.current?.abort();

      if (searchQuery.trim().length < 2) {
        setClientSearchResults([]);
        setShowClientDropdown(false);
        return;
      }

      clientSearchTimeoutRef.current = setTimeout(async () => {
        const controller = new AbortController();
        searchControllerRef.current = controller;
        try {
          setIsSearchingClients(true);
          const response = await data.searchClients({
            search: searchQuery,
            mode: mode ?? undefined,
            limit: 20,
            signal: controller.signal,
          });
          if (controller.signal.aborted) return;
          setClientSearchResults(response.items);
          setShowClientDropdown(response.items.length > 0);
        } catch {
          if (controller.signal.aborted) return;
          console.error("Failed to search clients.");
          setClientSearchResults([]);
          setShowClientDropdown(false);
        } finally {
          if (!controller.signal.aborted) setIsSearchingClients(false);
        }
      }, 300);
    },
    [agencyId, data, mode]
  );

  const handleClientSelect = (client: OperationalClientOption) => {
    const clientName = client.name;
    setQuery(clientName);
    setShowClientDropdown(false);
    setClientSearchResults([]);
    onFilterChange("", clientName);
  };

  return (
    <div className="relative w-full lg:w-[320px]">
      <div className="flex h-11 items-center rounded-xl border border-[#cccccd] bg-white px-4">
        <input
          type="text"
          value={query}
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            onFilterChange(value);
            handleClientSearch(value);
          }}
          placeholder="Search client name..."
          className="flex-1 bg-transparent text-[14px] font-normal text-black outline-none placeholder:text-[#b2b2b3]"
        />
        {isSearchingClients && <Loader2 className="h-4 w-4 animate-spin text-[#808081]" />}
      </div>

      {showClientDropdown && clientSearchResults.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-[200px] overflow-y-auto rounded-xl border border-[#cccccd] bg-white shadow-lg">
          {clientSearchResults.map((client) => (
            <button
              key={client.id}
              type="button"
              onClick={() => handleClientSelect(client)}
              className="w-full cursor-pointer border-b border-[#f0f0f0] px-4 py-3 text-left first:rounded-t-[12px] last:rounded-b-[12px] last:border-b-0 hover:bg-gray-50"
            >
              <p className="text-[14px] font-normal text-black">{client.name}</p>
              <p className="text-[12px] font-normal uppercase text-[#808081]">{client.mode}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
