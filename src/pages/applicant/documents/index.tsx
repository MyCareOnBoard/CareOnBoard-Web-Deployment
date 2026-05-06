import {Input} from "@/components/ui/input";
import {useGetDocumentsQuery} from "@/pages/applicant/documents/api";

export default function DocumentsPage() {
  const {data, isLoading} = useGetDocumentsQuery(undefined);

  const extractFileName = (url: string | null) => {
    if (!url) return "";
    const splittedFileUrl = url ? url.split("/") : []
    return splittedFileUrl[splittedFileUrl.length - 1]
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).replace(/ /g, ' ')
  };

  return (
    <div>
      <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">Documents</h1>
      <p className="text-black font-semibold">
        Here are your submitted documents
      </p>
      {isLoading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div
              className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#00b4b8] border-r-transparent"></div>
            <p className="text-sm text-[#808081]">Loading documents...</p>
          </div>
        </div>
      ) : (
        <form className={"mt-5 space-y-5 max-w-md"}>
          {
            Object.entries(data?.documents || {}).map(([key, value]) => (
              <div key={key}>
                <p className={"text-sm mb-1"}>{value.label}</p>
                <div className={"flex items-center justify-start gap-2"}>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder={extractFileName(value.url?.fileUrl) || "Not submitted"}
                      className="w-full pr-10"
                    />
                    {value.url?.fileUrl && <button
                        type="button"
                        className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() => {
                          window.open(value.url?.fileUrl, '_blank', 'noopener,noreferrer')
                        }}
                    >
                        <img src={"/eye.svg"} alt={"view icon"}/>
                    </button>}
                  </div>
                  {value.url?.expiryDate && <p className={"text-sm"}>Expiry Date ({formatDate(new Date(value.url?.expiryDate))})</p>}
                </div>
              </div>
            ))
          }
        </form>
      )}
    </div>
  );
}

