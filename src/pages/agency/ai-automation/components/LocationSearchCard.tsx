import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Loader2 } from "lucide-react";
import { useGooglePlacesAutocomplete } from "@/hooks/useGooglePlacesAutocomplete";
import { useReverseGeocode } from "@/hooks/useReverseGeocode";
import { useToast } from "@/hooks/use-toast";

interface LocationSearchCardProps {
  title?: string;
  description?: string;
  onLocationSelect: (location: {
    display_name: string;
    lat: string;
    lon: string;
    place_id?: string;
  }) => void;
  showCurrentLocationOption?: boolean;
}

export const LocationSearchCard: React.FC<LocationSearchCardProps> = ({
  title = "Quick shift details",
  description = "To find the best available staff, I just need a few details",
  onLocationSelect,
  showCurrentLocationOption = true,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [gettingLocation, setGettingLocation] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const locationAutocomplete = useGooglePlacesAutocomplete();
  const { reverseGeocode } = useReverseGeocode();
  const { toast } = useToast();

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.length > 0) {
      locationAutocomplete.handleInputChange(value);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = async (placeId: string) => {
    const details = await locationAutocomplete.selectSuggestion(placeId);
    if (details) {
      const location = {
        display_name: details.formattedAddress,
        lat: String(details.lat),
        lon: String(details.lng),
        place_id: placeId,
      };
      setSelectedLocation(details.formattedAddress);
      onLocationSelect(location);
      setSearchQuery("");
      setShowSuggestions(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation Not Supported",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive",
      });
      return;
    }

    setGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Try Google reverse geocoding first
          const result = await reverseGeocode(latitude, longitude);
          if (result) {
            const displayName = result.formattedAddress;
            const location = {
              display_name: displayName,
              lat: String(latitude),
              lon: String(longitude),
            };
            setSelectedLocation(displayName);
            onLocationSelect(location);
          } else {
            // Fallback to Nominatim if Google fails
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await response.json();
            const displayName = data.address?.name || data.display_name || "Current Location";
            const location = {
              display_name: displayName,
              lat: String(latitude),
              lon: String(longitude),
            };
            setSelectedLocation(displayName);
            onLocationSelect(location);
          }
        } catch (error) {
          console.error("Error reverse geocoding:", error);
          const location = {
            display_name: `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`,
            lat: String(latitude),
            lon: String(longitude),
          };
          setSelectedLocation(location.display_name);
          onLocationSelect(location);
        } finally {
          setGettingLocation(false);
        }
      },
      (error) => {
        setGettingLocation(false);
        let errorMessage = "Unable to get your location.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = "Location permission denied. Please enable location in your browser settings.";
        }
        toast({
          title: "Location Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    );
  };

  return (
    <Card className="overflow-hidden bg-white border border-gray-200 rounded-lg">
      <div className="p-4 space-y-3">
        {/* Title and Description */}
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {description && (
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
          <Input
            placeholder="Search location here"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => searchQuery.length > 0 && setShowSuggestions(true)}
            className="pl-10"
          />

          {/* Suggestions Dropdown */}
          {showSuggestions && locationAutocomplete.suggestions.length > 0 && (
            <div className="absolute left-0 right-0 z-50 mt-1 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg top-full max-h-64">
              {locationAutocomplete.suggestions.map((suggestion) => (
                <button
                  key={suggestion.placeId}
                  onClick={() => handleSelectSuggestion(suggestion.placeId)}
                  className="flex items-start w-full px-4 py-2 text-left border-b border-gray-100 hover:bg-gray-50 last:border-b-0"
                >
                  <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-gray-400" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{suggestion.mainText}</div>
                    {suggestion.secondaryText && (
                      <div className="text-xs text-gray-600">
                        {suggestion.secondaryText}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Or Divider */}
        {showCurrentLocationOption && (
          <>
            <div className="flex items-center space-x-2">
              <div className="flex-1 border-t border-gray-200" />
              <span className="px-2 text-xs text-gray-500">Or</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            {/* Use Current Location Button */}
            <Button
              variant="ghost"
              className="justify-start w-full text-gray-700 hover:bg-gray-50"
              onClick={handleUseCurrentLocation}
              disabled={gettingLocation}
            >
              {gettingLocation ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <MapPin className="w-4 h-4 mr-2" />
              )}
              Use current location
            </Button>
          </>
        )}

        {/* Selected Location Display */}
        {selectedLocation && (
          <div className="p-3 border border-teal-200 rounded-md bg-teal-50">
            <p className="mb-1 text-xs font-medium text-gray-900">
              Selected Location
            </p>
            <p className="text-sm text-gray-700">{selectedLocation}</p>
          </div>
        )}
      </div>
    </Card>
  );
};
