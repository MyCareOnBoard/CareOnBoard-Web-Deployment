import { useState } from "react";
import RideCard from "./RideCard";

interface Ride {
  id: string;
  clientName: string;
  location: string;
  time: string;
  distance: string;
}

export default function UpcomingRides() {
  const [rides] = useState<Ride[]>([
    {
      id: "1",
      clientName: "Dr.Brooklyn Simmons",
      location: "221/B Baker Street",
      time: "2:30 PM",
      distance: "2Km",
    },
    {
      id: "2",
      clientName: "Dr.Brooklyn Simmons",
      location: "221/B Baker Street",
      time: "2:30 PM",
      distance: "2Km",
    },
    {
      id: "3",
      clientName: "Dr.Brooklyn Simmons",
      location: "221/B Baker Street",
      time: "2:30 PM",
      distance: "2Km",
    },
    {
      id: "4",
      clientName: "Dr.Brooklyn Simmons",
      location: "221/B Baker Street",
      time: "2:30 PM",
      distance: "2Km",
    },
    {
      id: "5",
      clientName: "Dr.Brooklyn Simmons",
      location: "221/B Baker Street",
      time: "2:30 PM",
      distance: "2Km",
    },
    {
      id: "6",
      clientName: "Dr.Brooklyn Simmons",
      location: "221/B Baker Street",
      time: "2:30 PM",
      distance: "2Km",
    },
    {
      id: "7",
      clientName: "Dr.Brooklyn Simmons",
      location: "221/B Baker Street",
      time: "2:30 PM",
      distance: "2Km",
    },
  ]);

  return (
    <div className="p-6 bg-white rounded-2xl">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-[#10141a] mb-1">Upcoming Ride</h2>
        <p className="text-sm text-[#808081]">These are your Previous clients</p>
      </div>

      <div className="space-y-3">
        {rides.map((ride) => (
          <RideCard key={ride.id} {...ride} />
        ))}
      </div>
    </div>
  );
}