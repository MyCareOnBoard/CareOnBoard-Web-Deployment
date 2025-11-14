import { useState } from "react";
import CurrentRide from "./components/CurrentRide";
import UpcomingRides from "./components/UpcomingRides";

export default function MileagePage() {
  const [totalMileage] = useState(23); // in KM

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
          Mileage
        </h1>
        <div className="text-right">
          <span className="text-lg font-semibold text-[#808081]">Total Mileage : </span>
          <span className="text-lg font-semibold text-[#10141a]">{totalMileage}KM</span>
        </div>
      </div>

      {/* Current Ride Section */}
      <CurrentRide />

      {/* Upcoming Rides Section */}
      <UpcomingRides />
    </div>
  );
}