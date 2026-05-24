import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { searchClients, type Client } from "@/lib/api/clients";
import { formatShiftLocation, type ShiftLocation } from "@/lib/api/shifts";
import { useAuth } from "@/utils/auth";

type ClaimsClientSearchProps = {
  onFilterChange: (query: string, selectedClientName?: string) => void;
};

function getClientPrimaryAddress(client: Client): ShiftLocation | null {
  if (client.primaryAddress) {
    return {
      address: client.primaryAddress.address,
      countyState: client.primaryAddress.countyState,
      zipCode: client.primaryAddress.zipCode,
      latlon: client.primaryAddress.location,
    };
  }

  const fallback: ShiftLocation = {
    address: client.address,
    countyState: client.countyState,
    zipCode: client.zipCode,
    latlon: client.location,
  };

  if (fallback.address || fallback.countyState || fallback.zipCode || fallback.latlon) {
    return fallback;
  }

  return null;
}

function getClientDisplayName(client: Client) {
  return client.firstName && client.lastName
    ? `${client.firstName} ${client.lastName}`
    : client.id;
}

export default function ClaimsClientSearch({ onFilterChange }: ClaimsClientSearchProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [clientSearchResults, setClientSearchResults] = useState<Client[]>([]);
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const clientSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (clientSearchTimeoutRef.current) {
        clearTimeout(clientSearchTimeoutRef.current);
      }
    };
  }, []);

  const handleClientSearch = useCallback(
    async (searchQuery: string) => {
      if (clientSearchTimeoutRef.current) {
        clearTimeout(clientSearchTimeoutRef.current);
      }

      if (searchQuery.trim().length < 2) {
        setClientSearchResults([]);
        setShowClientDropdown(false);
        return;
      }

      clientSearchTimeoutRef.current = setTimeout(async () => {
        try {
          setIsSearchingClients(true);
          const results = await searchClients(searchQuery, user?.agencyId);
          setClientSearchResults(results);
          setShowClientDropdown(results.length > 0);
        } catch (error) {
          console.error("Failed to search clients:", error);
          setClientSearchResults([]);
          setShowClientDropdown(false);
        } finally {
          setIsSearchingClients(false);
        }
      }, 300);
    },
    [user?.agencyId]
  );

  const handleClientSelect = (client: Client) => {
    const clientName = getClientDisplayName(client);
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
              <p className="text-[14px] font-normal text-black">{getClientDisplayName(client)}</p>
              <p className="text-[12px] font-normal text-[#808081]">
                {formatShiftLocation(getClientPrimaryAddress(client))}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
