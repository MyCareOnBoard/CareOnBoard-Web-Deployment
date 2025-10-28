import {Input} from "@/components/ui/input";

export default function DocumentsPage() {
  const fileNames = [
    {
      category: "Resume",
      name: "Test resume.pdf",
      link: "https://uou.ac.in/sites/default/files/slm/BHM-503T.pdf"
    },
    {
      category: "Photo ID (Driver’s License, State ID, Passport)",
      name: "Driver’s license, State ID, Passport",
      link: "https://uou.ac.in/sites/default/files/slm/BHM-503T.pdf"
    },
    {
      category: "Social Security Card or valid work permit.",
      name: "Social security card",
      link: "https://uou.ac.in/sites/default/files/slm/BHM-503T.pdf"
    },
    {
      category: "High School Diploma/GED certificate.",
      name: "High School Diploma Certificate",
      link: "https://uou.ac.in/sites/default/files/slm/BHM-503T.pdf"
    },
    {
      category: "Relevant Certificates",
      name: "Relevant Certificates",
      link: "https://uou.ac.in/sites/default/files/slm/BHM-503T.pdf"
    },
    {
      category: "Photo ID (Driver’s License, State ID, Passport)",
      name: "Driver’s license, State ID, Passport",
      link: "https://uou.ac.in/sites/default/files/slm/BHM-503T.pdf"
    },
  ];
  return (
    <div>
      <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">Documents</h1>
      <p className="text-black font-semibold">
        Here are your submitted documents
      </p>
      <form className={"mt-5 space-y-5 max-w-md"}>
        {
          fileNames.map((file) => (
            <div key={file.name}>
              <p className={"text-sm mb-1"}>{file.category}</p>
              <div className="relative">
                <Input
                  type="text"
                  placeholder={file.name}
                  className="w-full pr-10"
                />
                <button
                  type="button"
                  className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => {
                    window.open(file.link, '_blank', 'noopener,noreferrer')
                  }}
                >
                  <img src={"/eye.svg"} alt={"view icon"}/>
                </button>
              </div>
            </div>
          ))
        }
      </form>
    </div>
  );
}

