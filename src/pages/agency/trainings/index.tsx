import React, {useMemo, useState} from "react";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {ChevronLeft, ChevronRight, Search} from "lucide-react";
import AgencyAssignTrainingModal, {SaveTrainingData} from "@/pages/agency/trainings/assignTraining";
import ReviewTrainingsModal from "@/pages/agency/trainings/reviewTrainingsModal";
import {
  useGetTrainingsQuery,
  useSaveTrainingMutation,
  TrainingData
} from "@/pages/agency/trainings/trainingApi";
import {useAuth} from "@/utils/auth";
import {toast} from "sonner";
import {AnimatePresence, motion} from "framer-motion";

export default function AgencyTrainings() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState<boolean>(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedEmployee, setSelectedEmployee] = useState<{
    id: string;
    fullName: string;
    profilePictureUrl?: string;
    trainings: TrainingData[];
  } | null>(null);

  const {user} = useAuth();
  const [saveTraining, {isLoading}] = useSaveTrainingMutation();
  const {data: trainings, isLoading: trainingsLoading} = useGetTrainingsQuery(user?.agencyId!, {
    skip: !user?.agencyId,
    refetchOnMountOrArgChange: true
  });
  const filteredTrainings = useMemo(() => {
    if (!trainings) return [];
    if (!searchQuery) return trainings;
    return trainings.filter((training) => training.fullName.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [trainings, searchQuery]);

  const itemsPerPage = 8;
  const totalPages = Math.ceil(filteredTrainings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredTrainings.slice(startIndex, startIndex + itemsPerPage);

  const handleSave = async (
    data: SaveTrainingData
  ) => {
    if (!user?.agencyId) return;

    try {
      await saveTraining({
        agencyId: user?.agencyId!,
        trainingData: {
          name: data.trainingName,
          timeFrame: data.timeFrame,
          assignedDsp: data.dspId,
          trainingType: data.trainingType,
          completedAt: null,
          status: "Not Approved",
          approved: false
        }
      }).unwrap();
      setIsTrainingModalOpen(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save training");
    }
  }

  const handleTrainingModalOpen = (
    dspId: string,
    dspName: string,
    profilePictureUrl: string,
    trainings: TrainingData[]
  ) => {
    setSelectedEmployee({
      id: dspId,
      fullName: dspName,
      profilePictureUrl,
      trainings: trainings
    });
    setIsTrainingModalOpen(true);
  }

  const handleReviewModalOpen = (
    dspId: string,
    dspName: string,
    profilePictureUrl: string,
    trainings: TrainingData[]
  ) => {
    setSelectedEmployee({
      id: dspId,
      fullName: dspName,
      profilePictureUrl,
      trainings: trainings
    });
    setIsReviewModalOpen(true);
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col">
      <div className={"mb-8 flex items-center justify-between"}>
        <div>
          <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
            Trainings
          </h1>
        </div>
      </div>
      <div className={"mt-3 bg-[#FFFFFF4D] rounded-xl p-4 flex-1 flex flex-col"}>
        <div className={"flex items-center justify-between"}>
          <div>
            <h4 className={"font-semibold text-lg"}>Training Log</h4>
            <p className={"text-[#808081]"}>These are your Pending Trainings</p>
          </div>
          <div className={"flex items-center gap-4"}>
            <div className="relative w-[240px] animate-in fade-in slide-in-from-right-2 duration-300">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#808081] pointer-events-none z-10"/>
              <Input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 h-10 border-0 rounded-full bg-[#f8f9fa] focus-visible:ring-1 focus-visible:ring-[#2563eb] focus-visible:ring-offset-0"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 mt-6 overflow-auto">
          <div className="space-y-4">
            {!trainingsLoading && (
              paginatedData.length > 0 ? (
                paginatedData.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between gap-4 backdrop-blur-[20px] bg-white/50 rounded-[20px] flex items-center p-4"
                  >
                    {/* Avatar */}
                    <div className={"flex gap-4 items-center"}>
                      <div className="w-[52.5px] h-[60px] rounded-[8px] overflow-hidden flex-shrink-0">
                        {item?.profilePictureUrl
                          ? (
                            <img
                              src={item?.profilePictureUrl}
                              alt={"DSP"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center bg-[#00b4b8] text-white rounded-[8px]">
                              {item?.fullName?.charAt(0).toUpperCase()}
                            </div>
                          )}
                      </div>
                      {/* Name */}
                      <div>
                        <p className="text-[16px] font-semibold leading-[1.6] text-black">
                          {item?.fullName}
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#0EAF520D] border border-[#0EAF52] rounded-[60px] px-4 py-2">
                      <p className="text-[12px] font-semibold text-[#0EAF52] capitalize">
                        {item?.status}
                      </p>
                    </div>

                    <div>
                      <p className="text-[14px] font-medium text-[#808081] mb-0">
                        Training
                      </p>
                      <p className="text-[14px] font-medium text-black">
                        {item.trainings.length}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        className="bg-[#B2B2B3] border border-[#B2B2B3] text-white hover:bg-[#00b4b8] rounded-[60px] px-4 py-2 text-[12px] font-semibold h-auto min-w-[84px]"
                        onClick={() => handleReviewModalOpen(
                          item.id,
                          item.fullName,
                          item.profilePictureUrl,
                          item.trainings
                        )}
                      >
                        Review Trainings
                      </Button>
                      <Button
                        className="bg-[#00b4b8] border border-[#00b4b8] text-white hover:bg-[#00b4b8] rounded-[60px] px-4 py-2 text-[12px] font-semibold h-auto min-w-[84px]"
                        onClick={() => handleTrainingModalOpen(
                          item.id,
                          item.fullName,
                          item.profilePictureUrl,
                          item.trainings
                        )}
                      >
                        Assign Training
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center py-20">
                  <p className="text-[16px] text-[#808081]">No data available</p>
                </div>
              ))
            }
            {trainingsLoading && (
              <div className="flex items-center justify-center py-20">
                <p className="text-[16px] text-[#808081]">Loading...</p>
              </div>
            )}
          </div>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <p className="text-[16px] font-medium text-[#10141a]">
              {currentPage}
              <span className="text-[14px] text-[#808081]">/{totalPages}</span>
            </p>
            <Button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="bg-white/50 backdrop-blur border border-white/30 p-[6px] rounded-full hover:bg-white/70 disabled:opacity-50 h-auto"
            >
              <ChevronLeft className="w-5 h-5 text-[#10141a]"/>
            </Button>
            <Button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="bg-white/50 backdrop-blur border border-white/30 p-[6px] rounded-full hover:bg-white/70 disabled:opacity-50 h-auto"
            >
              <ChevronRight className="w-5 h-5 text-[#10141a]"/>
            </Button>
          </div>
        )}
      </div>
      <AgencyAssignTrainingModal
        open={isTrainingModalOpen}
        onOpenChange={setIsTrainingModalOpen}
        mode={"create"}
        initialData={{
          dsp: selectedEmployee?.fullName || "",
          trainingType: "",
          trainingName: "",
          timeFrame: "",
          dspId: selectedEmployee?.id || "",
        }}
        onSave={handleSave}
        isLoading={isLoading}
      />
      <ReviewTrainingsModal
        open={isReviewModalOpen}
        onOpenChange={setIsReviewModalOpen}
        employee={selectedEmployee ? {
          id: selectedEmployee.id,
          fullName: selectedEmployee.fullName,
          role: "DSP",
          profilePictureUrl: selectedEmployee.profilePictureUrl
        } : null}
        trainings={selectedEmployee?.trainings || []}
        onApprovalChange={(trainingId, approved) => {
          console.log(`Training ${trainingId} approval changed to ${approved}`);
        }}
      />
      <AnimatePresence>
        {success && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
          >
            <motion.div
              initial={{scale: 0.9, opacity: 0}}
              animate={{scale: 1, opacity: 1}}
              exit={{scale: 0.9, opacity: 0}}
              transition={{duration: 0.25}}
              className="px-10 py-4 text-center bg-white shadow-lg rounded-xl max-w-sm flex flex-col justify-center"
            >
              <div className={"flex justify-center mb-3"}>
                <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="50" fill="#F0FAF4"/>
                  <rect x="14.5" y="14" width="72" height="72" rx="36" fill="#0EAF52"/>
                  <path fill-rule="evenodd" clip-rule="evenodd"
                        d="M56.0754 41.5727C56.7475 40.8334 57.9012 40.8059 58.6077 41.5124L60.659 43.5638C61.3424 44.2472 61.3424 45.3552 60.659 46.0386L48.5732 58.1245C47.8898 58.8079 46.7818 58.8079 46.0983 58.1245L41.0126 53.0387C40.3291 52.3553 40.3291 51.2472 41.0126 50.5638L42.5983 48.978C43.2818 48.2946 44.3898 48.2946 45.0732 48.978L47.3099 51.2147L56.0754 41.5727Z"
                        fill="white"/>
                </svg>
              </div>
              <h4 className="text-xl font-semibold">Training Assigned</h4>
              <p className="mt-1 text-sm text-gray-500">
                You have successfully assigned a training to {selectedEmployee?.fullName}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}