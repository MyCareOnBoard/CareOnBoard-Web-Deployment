import {Input} from "@/components/ui/input";
import {useGetDocumentsQuery} from "@/pages/documents/api";
import {PageLoader} from "@/components/ui/loader";

export default function DocumentsPage() {
  const {data, isLoading} = useGetDocumentsQuery(undefined, {
    refetchOnMountOrArgChange: true
  });

  const extractFileName = (url: string | null) => {
    if (!url) return "";
    const splittedFileUrl = url ? url.split("/") : []
    return splittedFileUrl[splittedFileUrl.length - 1]
  }

  if (isLoading) {
    return <PageLoader text="Loading documents..." />
  }

  return (
    <div>
      <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">Documents</h1>
      <p className="text-black font-semibold">
        Here are your submitted documents
      </p>
      <form className={"mt-5 space-y-5 max-w-md"}>
        {
          Object.entries(data?.documents || {}).map(([key, value]) => (
            <div key={key}>
              <p className={"text-sm mb-1"}>{value.label}</p>
              <div className="relative">
                <Input
                  type="text"
                  placeholder={extractFileName(value.url) || "Not submitted"}
                  className="w-full pr-10"
                />
                {value.url && <button
                  type="button"
                  className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => {
                    window.open(value.url, '_blank', 'noopener,noreferrer')
                  }}
                >
                  <img src={"/eye.svg"} alt={"view icon"}/>
                </button>}
              </div>
            </div>
          ))
        }
      </form>
    </div>
  );
}

