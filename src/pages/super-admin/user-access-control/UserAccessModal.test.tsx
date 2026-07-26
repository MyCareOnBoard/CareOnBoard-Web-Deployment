import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  getSuperAdminAccessConfig,
  type SuperAdminAccessConfig,
} from "@/lib/api/super-admin-users";
import UserAccessModal from "./UserAccessModal";

vi.mock("@/lib/api/super-admin-users", () => ({
  getAccessScopes: () => ["Compliance Monitor", "Reports"],
  getSuperAdminAccessConfig: vi.fn(),
}));

const config: SuperAdminAccessConfig = {
  accessScopes: ["Compliance Monitor", "Reports"],
  roleTemplates: [
    {
      key: "compliance_manager",
      label: "Compliance Manager",
      accessList: ["Compliance Monitor", "Reports"],
    },
    { key: "custom", label: "Custom role", accessList: [] },
  ],
  canAssignAllAgencies: false,
};

describe("UserAccessModal", () => {
  it("loads canonical role configuration when the page has not supplied it", async () => {
    let resolveConfig!: (value: SuperAdminAccessConfig) => void;
    vi.mocked(getSuperAdminAccessConfig).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveConfig = resolve;
      }),
    );

    render(
      <UserAccessModal
        open
        onOpenChange={vi.fn()}
        mode="create"
        onSave={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByRole("status", { name: "Loading roles" })).toBeVisible();
    resolveConfig(config);
    expect(
      await screen.findByRole("button", { name: /compliance manager/i }),
    ).toBeVisible();
    expect(getSuperAdminAccessConfig).toHaveBeenCalledTimes(1);
  });

  it("submits explicit role, template, and final permission fields", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <UserAccessModal
        open
        onOpenChange={vi.fn()}
        mode="create"
        config={config}
        onSave={onSave}
      />,
    );

    await user.type(screen.getByLabelText("Name"), "Ada Admin");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "StrongPass123!");
    await user.click(
      screen.getByRole("button", { name: /compliance manager/i }),
    );
    await user.click(screen.getByRole("checkbox", { name: "Reports" }));
    await user.click(screen.getByRole("button", { name: "Add User" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        name: "Ada Admin",
        email: "ada@example.com",
        password: "StrongPass123!",
        role: "Compliance Manager",
        roleTemplate: "compliance_manager",
        accessList: ["Compliance Monitor"],
      });
    });
  });

  it("requires a trimmed 2 to 60 character custom title and permissions", async () => {
    const user = userEvent.setup();
    render(
      <UserAccessModal
        open
        onOpenChange={vi.fn()}
        mode="create"
        config={config}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    const save = screen.getByRole("button", { name: "Add User" });
    const title = screen.getByLabelText("Custom role title");
    expect(save).toBeDisabled();

    await user.type(title, " A ");
    await user.click(
      screen.getByRole("checkbox", { name: "Compliance Monitor" }),
    );
    expect(save).toBeDisabled();

    await user.clear(title);
    await user.type(title, " Quality lead ");
    expect(save).toBeEnabled();

    await user.clear(title);
    await user.type(title, "x".repeat(61));
    expect(save).toBeDisabled();
  });

  it("resets role state from edit data each time the modal opens", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    const initialData = {
      name: "Casey Admin",
      email: "casey@example.com",
      password: "",
      role: "Compliance Manager",
      roleTemplate: "compliance_manager" as const,
      accessList: ["Compliance Monitor", "Reports"],
    };
    const { rerender } = render(
      <UserAccessModal
        open
        onOpenChange={onOpenChange}
        mode="edit"
        config={config}
        initialData={initialData}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: "Reports" }));
    expect(screen.getByRole("checkbox", { name: "Reports" })).not.toBeChecked();

    rerender(
      <UserAccessModal
        open={false}
        onOpenChange={onOpenChange}
        mode="edit"
        config={config}
        initialData={initialData}
        onSave={onSave}
      />,
    );
    rerender(
      <UserAccessModal
        open
        onOpenChange={onOpenChange}
        mode="edit"
        config={config}
        initialData={initialData}
        onSave={onSave}
      />,
    );

    expect(await screen.findByRole("checkbox", { name: "Reports" })).toBeChecked();
    expect(screen.getByLabelText("Password")).toHaveValue("");
    expect(screen.getByLabelText("Email")).toBeDisabled();
  });

  it("keeps the modal open and exposes saving state while save is pending", async () => {
    const user = userEvent.setup();
    let resolveSave!: () => void;
    const onSave = vi.fn(
      () => new Promise<void>((resolve) => {
        resolveSave = resolve;
      }),
    );
    const onOpenChange = vi.fn();
    render(
      <UserAccessModal
        open
        onOpenChange={onOpenChange}
        mode="edit"
        config={config}
        initialData={{
          name: "Casey Admin",
          email: "casey@example.com",
          password: "",
          role: "Compliance Manager",
          roleTemplate: "compliance_manager",
          accessList: ["Compliance Monitor"],
        }}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Update User" }));

    expect(screen.getByRole("button", { name: "Updating user..." })).toBeDisabled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    resolveSave();
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
