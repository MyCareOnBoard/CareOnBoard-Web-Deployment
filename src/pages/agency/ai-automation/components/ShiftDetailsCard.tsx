import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Calendar, Clock } from "lucide-react";
import { LocationModal } from "./LocationModal";

interface ShiftDetailsCardProps {
  title: string;
  description?: string;
  shiftData?: {
    date?: string;
    time?: string;
    location?: string;
  };
  onLocationSelected?: (location: {
    display_name: string;
    lat: string;
    lon: string;
    place_id?: string;
  }) => void;
  actionLabel?: string;
}

export const ShiftDetailsCard: React.FC<ShiftDetailsCardProps> = ({
  title,
  description,
  shiftData = {},
  onLocationSelected,
  actionLabel = "Set up shift",
}) => {
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  const handleLocationSelect = (location: {
    display_name: string;
    lat: string;
    lon: string;
    place_id?: string;
  }) => {
    onLocationSelected?.(location);
    setLocationModalOpen(false);
  };

  return (
    <>
      <Card className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-4 space-y-3">
          {/* Title */}
          <h3 className="font-semibold text-gray-900">{title}</h3>

          {/* Description */}
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}

          {/* Shift Details */}
          <div className="space-y-2">
            {shiftData.date && (
              <div className="flex items-center text-sm text-gray-700">
                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                <span>{shiftData.date}</span>
              </div>
            )}
            {shiftData.time && (
              <div className="flex items-center text-sm text-gray-700">
                <Clock className="h-4 w-4 mr-2 text-gray-400" />
                <span>{shiftData.time}</span>
              </div>
            )}
            {shiftData.location && (
              <div className="flex items-start text-sm text-gray-700">
                <MapPin className="h-4 w-4 mr-2 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="flex-1">{shiftData.location}</span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <Button
            className="w-full mt-2 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => setLocationModalOpen(true)}
          >
            {actionLabel}
          </Button>
        </div>
      </Card>

      {/* Location Modal */}
      <LocationModal
        open={locationModalOpen}
        onOpenChange={setLocationModalOpen}
        onLocationSelect={handleLocationSelect}
        title="Quick shift details"
        description="To find the best available staff, I just need a few details"
        shiftDetails={shiftData}
      />
    </>
  );
};
