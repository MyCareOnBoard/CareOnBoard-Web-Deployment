import { describe, expect, it } from "vitest";
import { router } from "./index";

function flattenRoutes(routes: readonly any[]): any[] {
  return routes.flatMap((route) => [route, ...flattenRoutes(route.children ?? [])]);
}

describe("super-admin shift workspace routes", () => {
  it("mounts every operational page as a lazy child of one persistent workspace shell", () => {
    const allRoutes = flattenRoutes(router.routes);
    const workspace = allRoutes.find((route) => route.path === "/super-admin/shifts");

    expect(workspace?.element).toBeDefined();
    expect(workspace?.children).toEqual(expect.arrayContaining([
      expect.objectContaining({ index: true, element: expect.anything() }),
      expect.objectContaining({ path: "list", element: expect.anything() }),
      expect.objectContaining({ path: "maintenance", element: expect.anything() }),
      expect.objectContaining({ path: ":shiftId", element: expect.anything() }),
    ]));

    expect(workspace?.children).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "approvals", element: expect.anything() }),
      expect.objectContaining({ path: "activity-logs", element: expect.anything() }),
    ]));

    for (const path of [
      "/super-admin/shifts/list",
      "/super-admin/shifts/maintenance",
      "/super-admin/shifts/:shiftId",
    ]) {
      expect(allRoutes.filter((route) => route.path === path)).toHaveLength(0);
    }
  });
});
