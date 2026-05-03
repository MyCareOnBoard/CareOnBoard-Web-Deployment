import { NavLink } from "react-router";
import { Routes } from "@/routes/constants";

interface DirectoryViewLink {
  label: string;
  to: string;
  exact?: boolean;
  activePaths?: string[];
}

const viewLinks: DirectoryViewLink[] = [
  {
    label: "Pending Applicants",
    to: Routes.agency.applicantDirectory,
    exact: true,
    activePaths: [
      Routes.agency.applicantDirectory,
      Routes.agency.applicantPendingApplicants,
    ],
  },
  {
    label: "All Applicants",
    to: Routes.agency.applicantAllApplicants,
  },
];

interface DirectoryViewNavProps {
  currentPath: string;
}

export function DirectoryViewNav({ currentPath }: DirectoryViewNavProps) {
  return (
    <div className="mb-6 flex flex-wrap gap-3">
      {viewLinks.map((link) => {
        const isActive = link.activePaths
          ? link.activePaths.includes(currentPath)
          : link.exact
            ? currentPath === link.to
            : currentPath.startsWith(link.to);

        return (
          <NavLink
            key={link.to}
            to={link.to}
            className={`rounded-[60px] border px-4 py-2 text-[13px] font-semibold transition-colors ${
              isActive
                ? "border-[#00b4b8] bg-[#00b4b8] text-white"
                : "border-[#d8dcdf] bg-white/80 text-[#525253] hover:border-[#00b4b8] hover:text-[#00b4b8]"
            }`}
          >
            {link.label}
          </NavLink>
        );
      })}
    </div>
  );
}
