import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Loader2, X } from "lucide-react";
import { useGooglePlacesAutocomplete } from "@/hooks/useGooglePlacesAutocomplete";
import { useReverseGeocode } from "@/hooks/useReverseGeocode";
import { useToast } from "@/hooks/use-toast";

interface LocationDetails {
  display_name: string;
  lat: string;
  lon: string;
  place_id?: string;
}

interface LocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLocationSelect: (location: LocationDetails) => void;
  title?: string;
  description?: string;
  shiftDetails?: {
    date?: string;
    time?: string;
    location?: string;
  };
}

export const LocationModal: React.FC<LocationModalProps> = ({
  open,
  onOpenChange,
  onLocationSelect,
  title = "Quick shift details",
  description = "To find the best available staff, I just need a few details",
  shiftDetails = {},
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<LocationDetails | null>(null);
  const [gettingCurrentLocation, setGettingCurrentLocation] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLDivElement>(null);

  const locationAutocomplete = useGooglePlacesAutocomplete();
  const { reverseGeocode } = useReverseGeocode();
  const { toast } = useToast();

  // Handle clicks outside suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSuggestions]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    locationAutocomplete.handleInputChange(value);
    setShowSuggestions(value.length > 0);
  };

  const handleSelectSuggestion = async (placeId: string) => {
    const details = await locationAutocomplete.selectSuggestion(placeId);
    if (details) {
      const location: LocationDetails = {
        display_name: details.formattedAddress,
        lat: String(details.lat),
        lon: String(details.lng),
        place_id: placeId,
      };
      setSelectedLocation(location);
      setSearchQuery(details.formattedAddress);
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

    setGettingCurrentLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Try Google reverse geocoding first
            const result = await reverseGeocode(latitude, longitude);
          if (result) {
            const location: LocationDetails = {
              display_name: result.formattedAddress,
              lat: String(latitude),
              lon: String(longitude),
            };
            setSelectedLocation(location);
            setSearchQuery(result.formattedAddress);
          } else {
            // Fallback to Nominatim if Google fails
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await response.json();
            const location: LocationDetails = {
              display_name: data.address?.name || data.display_name || "Current Location",
              lat: String(latitude),
              lon: String(longitude),
            };
            setSelectedLocation(location);
            setSearchQuery(location.display_name);
          }
        } catch (error) {
          console.error("Error reverse geocoding:", error);
          const location: LocationDetails = {
            display_name: `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`,
            lat: String(latitude),
            lon: String(longitude),
          };
          setSelectedLocation(location);
          setSearchQuery(location.display_name);
        } finally {
          setGettingCurrentLocation(false);
        }
      },
      (error) => {
        setGettingCurrentLocation(false);
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

  const handleLocationConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
      onOpenChange(false);
      // Reset state
      setSearchQuery("");
      setSelectedLocation(null);
      setShowSuggestions(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state when closing
    setSearchQuery("");
    setSelectedLocation(null);
    setShowSuggestions(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-lg">
        <DialogHeader className="space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
              {description && (
                <p className="mt-1 text-sm text-gray-600">{description}</p>
              )}
            </div>
            <DialogClose className="rounded-md hover:bg-gray-100 p-1">
              <X className="h-5 w-5" />
            </DialogClose>
          </div>

          {/* Shift Details Display */}
          {(shiftDetails.date || shiftDetails.time || shiftDetails.location) && (
            <div className="mt-4 rounded-md bg-gray-50 p-3 text-sm">
              {shiftDetails.date && (
                <div className="flex justify-between">
                  <span className="font-medium">Date:</span>
                  <span>{shiftDetails.date}</span>
                </div>
              )}
              {shiftDetails.time && (
                <div className="flex justify-between mt-1">
                  <span className="font-medium">Time:</span>
                  <span>{shiftDetails.time}</span>
                </div>
              )}
              {shiftDetails.location && (
                <div className="flex justify-between mt-1">
                  <span className="font-medium">Location:</span>
                  <span className="text-right">{shiftDetails.location}</span>
                </div>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search Location Input */}
          <div ref={searchInputRef} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search location here"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => searchQuery.length > 0 && setShowSuggestions(true)}
                className="pl-10"
              />
            </div>

            {/* Location Suggestions Dropdown */}
            {showSuggestions && locationAutocomplete.suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
                {locationAutocomplete.suggestions.map((suggestion) => (
                  <button
                    key={suggestion.placeId}
                    onClick={() => handleSelectSuggestion(suggestion.placeId)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-start"
                  >
                    <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-gray-400" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{suggestion.mainText}</div>
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
          <div className="flex items-center space-x-2">
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-xs text-gray-500 px-2">Or</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          {/* Use Current Location Button */}
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-700 hover:bg-gray-50"
            onClick={handleUseCurrentLocation}
            disabled={gettingCurrentLocation}
          >
            {gettingCurrentLocation ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4 mr-2" />
            )}
            Use current location
          </Button>

          {/* Selected Location Display */}
          {selectedLocation && (
            <div className="rounded-md bg-teal-50 p-3 border border-teal-200">
              <p className="text-sm font-medium text-gray-900">
                Selected Location
              </p>
              <p className="text-sm text-gray-700 mt-1">{selectedLocation.display_name}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={handleLocationConfirm}
            disabled={!selectedLocation}
          >
            Select location
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
