import BillingOverviewCards from "../../components/BillingOverviewCards";
import { OVERVIEW_STATS } from "../data/mockClaimsDashboardData";

export default function ClaimsOverviewCards() {
  return <BillingOverviewCards stats={OVERVIEW_STATS} showCountBadge />;
}
