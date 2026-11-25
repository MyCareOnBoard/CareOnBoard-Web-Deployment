import { NavLink } from "react-router";
import { Routes } from "@/routes/constants";
import { cn } from "@/lib/utils";

interface DirectoryViewLink {
  label: string;
  to: string;
  exact?: boolean;
  activePaths?: string[];
}

const viewLinks: DirectoryViewLink[] = [
  {
    label: "Pending",
    to: Routes.agency.applicantDirectory,
    exact: true,
    activePaths: [
      Routes.agency.applicantDirectory,
      Routes.agency.applicantPendingApplicants,
    ],
  },
  {
    label: "All",
    to: Routes.agency.applicantAllApplicants,
  },
];

interface DirectoryViewNavProps {
  currentPath: string;
  className?: string;
}

/** Pending / All applicants, styled like the agency segmented control. */
export function DirectoryViewNav({ currentPath, className }: DirectoryViewNavProps) {
  return (
    <nav aria-label="Applicant lists" className={cn("flex max-w-full overflow-x-auto rounded-[12px] bg-[#f4f5f6] p-1 dark:bg-white/5", className)}>
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
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex h-9 shrink-0 items-center rounded-[9px] px-3 text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#007679]",
              isActive
                ? "bg-[#003839] font-medium text-white shadow-[0_1px_2px_rgba(16,20,26,0.12)] dark:bg-[#0f7e7d]"
                : "text-[#4b535b] hover:text-[#10141a] dark:text-[#9aa4a8] dark:hover:text-[#f4f6f7]",
            )}
          >
            {link.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
