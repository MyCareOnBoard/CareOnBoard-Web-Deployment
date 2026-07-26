import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import type { SuperAdminAccessConfig } from "@/lib/api/super-admin-users";
import RolePermissionsFields from "./RolePermissionsFields";
import type { UserAccessFormValue } from "./userAccessTypes";

const config: SuperAdminAccessConfig = {
  accessScopes: [
    "Agency Directory",
    "Compliance Monitor",
    "Reports",
    "Corporate Support",
  ],
  roleTemplates: [
    {
      key: "platform_administrator",
      label: "Platform Administrator",
      accessList: [
        "Agency Directory",
        "Compliance Monitor",
        "Reports",
        "Corporate Support",
        "System Settings",
      ],
    },
    {
      key: "compliance_manager",
      label: "Compliance Manager",
      accessList: ["Compliance Monitor", "Reports"],
    },
    {
      key: "billing_manager",
      label: "Billing Manager",
      accessList: ["Reports"],
    },
    {
      key: "custom",
      label: "Custom role",
      accessList: [],
    },
  ],
  canAssignAllAgencies: false,
};

type RoleValue = Pick<
  UserAccessFormValue,
  "role" | "roleTemplate" | "accessList"
>;

function RoleFieldsHarness({
  initialValue = {
    role: "",
    roleTemplate: "custom",
    accessList: [],
  },
}: {
  initialValue?: RoleValue;
}) {
  const [value, setValue] = useState<RoleValue>(initialValue);

  return (
    <RolePermissionsFields
      config={config}
      value={value}
      disabled={false}
      onChange={setValue}
    />
  );
}

describe("RolePermissionsFields", () => {
  it("seeds predefined permissions and intersects them with creator access", async () => {
    const user = userEvent.setup();
    render(<RoleFieldsHarness />);

    await user.click(
      screen.getByRole("button", { name: /platform administrator/i }),
    );

    expect(
      screen.getByRole("button", { name: /platform administrator/i }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: /platform administrator/i }),
    ).toHaveClass("bg-[#dff7f5]");
    expect(
      screen.getByRole("checkbox", { name: "Compliance Monitor" }),
    ).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Reports" })).toBeChecked();
    expect(
      screen.queryByRole("checkbox", { name: "System Settings" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the seeded access list editable", async () => {
    const user = userEvent.setup();
    render(<RoleFieldsHarness />);

    await user.click(
      screen.getByRole("button", { name: /compliance manager/i }),
    );
    const reports = screen.getByRole("checkbox", { name: "Reports" });
    const support = screen.getByRole("checkbox", {
      name: "Corporate Support",
    });

    await user.click(reports);
    await user.click(support);

    expect(reports).not.toBeChecked();
    expect(support).toBeChecked();
  });

  it("reveals a required custom title and clears seeded permissions", async () => {
    const user = userEvent.setup();
    render(<RoleFieldsHarness />);

    await user.click(
      screen.getByRole("button", { name: /compliance manager/i }),
    );
    expect(
      screen.getByRole("checkbox", { name: "Compliance Monitor" }),
    ).toBeChecked();

    await user.click(screen.getByRole("button", { name: /custom role/i }));

    expect(screen.getByLabelText("Custom role title")).toBeVisible();
    expect(screen.getByLabelText("Custom role title")).toBeRequired();
    expect(screen.queryAllByRole("checkbox", { checked: true })).toHaveLength(0);
  });

  it("does not change roles until edited permissions are confirmed", async () => {
    const user = userEvent.setup();
    render(
      <RoleFieldsHarness
        initialValue={{
          role: "Compliance Manager",
          roleTemplate: "compliance_manager",
          accessList: ["Compliance Monitor", "Reports"],
        }}
      />,
    );

    const complianceRole = screen.getByRole("button", {
      name: /compliance manager/i,
    });
    const corporateSupport = screen.getByRole("checkbox", {
      name: "Corporate Support",
    });
    await user.click(corporateSupport);
    await user.click(
      screen.getByRole("button", { name: /billing manager/i }),
    );

    expect(screen.getByText("Replace edited permissions?")).toBeVisible();
    expect(complianceRole).toHaveAttribute("aria-pressed", "true");
    expect(corporateSupport).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Keep edits" }));

    expect(
      screen.getByRole("button", { name: /compliance manager/i }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("checkbox", { name: "Corporate Support" }),
    ).toBeChecked();

    await user.click(
      screen.getByRole("button", { name: /billing manager/i }),
    );
    await user.click(
      screen.getByRole("button", { name: "Replace permissions" }),
    );

    expect(
      screen.getByRole("button", { name: /billing manager/i }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("checkbox", { name: "Reports" })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Compliance Monitor" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Corporate Support" }),
    ).not.toBeChecked();
  });
});
