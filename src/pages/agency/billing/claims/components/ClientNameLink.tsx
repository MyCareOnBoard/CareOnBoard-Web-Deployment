import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { Routes } from "@/routes/constants";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";

type ClientNameLinkProps = {
  name: string;
  clientId?: string;
  className?: string;
};

export default function ClientNameLink({ name, clientId, className }: ClientNameLinkProps) {
  const { actor } = useOperationalAgency();
  const trimmedClientId = clientId?.trim();

  if (!trimmedClientId || actor !== "agency") {
    return <span className={className}>{name}</span>;
  }

  return (
    <Link
      to={Routes.agency.clientDetails.replace(":clientId", trimmedClientId)}
      className={cn(
        "truncate transition-colors hover:text-[#00b4b8] hover:underline",
        className,
      )}
    >
      {name}
    </Link>
  );
}
