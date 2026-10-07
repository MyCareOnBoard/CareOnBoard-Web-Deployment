import { createContext, useContext, useState, type ReactNode } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useNavigate,
  useSearchParams,
} from "react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/utils/auth/context/AuthContext";
import {
  agencyCareApi,
  type CareMe,
  type CareOrganization,
} from "@/lib/api/agencyCare";
import { useScopedRequest } from "./hooks";
import { CareFailure, CareLoad } from "./ui";
import { CareNotificationProvider } from "./CareNotifications";
import "./agency-care.css";

type CareContext = {
  uid: string;
  me: CareMe;
  organization: CareOrganization;
  agencyKey: string;
  scope: string;
  refreshContext: () => void;
};
const Context = createContext<CareContext | null>(null);
export function useAgencyCare() {
  const value = useContext(Context);
  if (!value) throw new Error("Agency Care context is required.");
  return value;
}
export function AgencyCareLayout({
  children,
  embedded = false,
}: {
  children?: ReactNode;
  embedded?: boolean;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const uid = user?.uid ?? "";
  const me = useScopedRequest(
    uid,
    (signal) => agencyCareApi.me({ signal }),
    Boolean(uid),
  );
  const [selected, setSelected] = useState(() => search.get("agencyKey") || "");
  if (!uid)
    return (
      <div className="agency-care">
        <CareFailure
          message="Sign in to open Agency Care."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  if (me.loading)
    return (
      <div className="agency-care">
        <CareLoad />
      </div>
    );
  if (me.error || !me.data)
    return (
      <div className="agency-care">
        <CareFailure
          message={me.error || "Agency Care is unavailable."}
          onRetry={me.reload}
        />
      </div>
    );
  const organization =
    me.data.organizations.find((item) => item.agencyKey === selected) ??
    me.data.organizations[0];
  if (!organization)
    return (
      <div className="agency-care">
        <h1>Agency Care</h1>
        <p>
          Your account has no active care organization membership. Accept an
          invitation or contact your agency administrator.
        </p>
        <Button variant="outline" onClick={() => void logout()}>
          Sign out
        </Button>
      </div>
    );
  const scope = `${uid}|${organization.agencyKey}|${me.data.permissionRevision}`;
  return (
    <Context.Provider
      value={{
        uid,
        me: me.data,
        organization,
        agencyKey: organization.agencyKey,
        scope,
        refreshContext: me.reload,
      }}
    >
      <CareNotificationProvider
        key={scope}
        scope={scope}
        agencyKey={organization.agencyKey}
      >
        <div className={`agency-care${embedded ? " ac-embedded" : ""}`}>
          <div className="ac-module-bar">
            <Link className="ac-brand" to="/agency-care">
              Agency Care
            </Link>
            <label className="ac-organization">
              <span className="sr-only">Current organization</span>
              <select
                value={organization.agencyKey}
                onChange={(event) => {
                  setSelected(event.target.value);
                  navigate("/agency-care");
                }}
              >
                {me.data.organizations.map((item) => (
                  <option key={item.agencyKey} value={item.agencyKey}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            {me.data.restrictedPortal && (
              <Button variant="outline" onClick={() => void logout()}>
                Sign out
              </Button>
            )}
          </div>
          <nav className="ac-global-nav" aria-label="Agency Care">
            <NavLink end to="/agency-care">
              Clients
            </NavLink>
            <NavLink to="/agency-care/review-queue">Review queue</NavLink>
            <NavLink to="/agency-care/reports">Reports</NavLink>
            <NavLink to="/agency-care/notifications">Notifications</NavLink>
            <NavLink to="/agency-care/recovery">Publication recovery</NavLink>
            {organization.kind === "external" && (
              <NavLink to="/agency-care/settings">Agency settings</NavLink>
            )}
          </nav>
          <main className="ac-content" key={scope}>
            {children ?? <Outlet />}
          </main>
        </div>
      </CareNotificationProvider>
    </Context.Provider>
  );
}
