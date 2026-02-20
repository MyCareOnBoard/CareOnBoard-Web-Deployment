interface TrainingSectionProps {
  totalCount: number;
  completedCount: number;
  isLoading: boolean;
}

export function TrainingSection({ totalCount, completedCount, isLoading }: TrainingSectionProps) {
  return (
    <div className="bg-[#edf1f2] p-6 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Training</h3>
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span>Assigned · {totalCount || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-300"></div>
            <span>Training Completed · {completedCount || 0}</span>
          </div>
        </div>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-500"></div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-blue-500 rounded-lg h-10 relative">
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white text-sm font-medium">
                {totalCount || 0}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-blue-300 rounded-lg h-10 relative">
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white text-sm font-medium">
                {completedCount || 0}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
