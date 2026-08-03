import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";

type ClientNameLinkProps = {
  name: string;
  clientId?: string;
  className?: string;
};

export function ProviderFreeClientName({ name, className }: Omit<ClientNameLinkProps, "clientId">) {
  return <span className={className}>{name}</span>;
}

export default function ClientNameLink({ name, clientId, className }: ClientNameLinkProps) {
  const { capabilities, directoryRoutes } = useOperationalAgency();
  const trimmedClientId = clientId?.trim();
  const clientDetailsRoute = directoryRoutes?.clientDetails;

  if (!trimmedClientId || !capabilities.canAccessClientDirectory || !clientDetailsRoute) {
    return <span className={className}>{name}</span>;
  }

  return (
    <Link
      to={clientDetailsRoute(trimmedClientId)}
      className={cn(
        "truncate transition-colors hover:text-[#00b4b8] hover:underline",
        className,
      )}
    >
      {name}
    </Link>
  );
}
