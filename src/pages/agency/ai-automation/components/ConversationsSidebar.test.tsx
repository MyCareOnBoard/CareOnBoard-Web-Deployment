import { expect, test, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConversationsSidebar from "./ConversationsSidebar";

const deleteFn = vi.hoisted(() =>
  vi.fn(() => ({ unwrap: () => Promise.resolve() }))
);

vi.mock("../api", () => ({
  useListConversationsQuery: () => ({
    data: {
      conversations: [
        { id: "c1", title: "Test chat", messageCount: 3, lastMessageAt: null, createdAt: null },
      ],
    },
    isLoading: false,
  }),
  useDeleteConversationMutation: () => [deleteFn],
}));

test("renders open sidebar without nested buttons or console errors", () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  render(
    <ConversationsSidebar
      open
      activeId={null}
      onClose={() => {}}
      onSelect={() => {}}
      onNew={() => {}}
    />
  );

  expect(screen.getByText("Start a new conversation")).toBeInTheDocument();
  expect(screen.getByText("Test chat")).toBeInTheDocument();
  expect(document.querySelector("button button")).toBeNull();

  const nestingErrors = errorSpy.mock.calls.filter((args) =>
    String(args[0]).includes("cannot be a descendant")
  );
  expect(nestingErrors).toEqual([]);
  errorSpy.mockRestore();
});

test("Enter on delete button deletes; Enter on row selects", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();

  render(
    <ConversationsSidebar
      open
      activeId={null}
      onClose={() => {}}
      onSelect={onSelect}
      onNew={() => {}}
    />
  );

  const row = screen.getByRole("button", { name: /test chat/i });
  const deleteButton = within(row).getByRole("button");

  deleteButton.focus();
  await user.keyboard("{Enter}");
  expect(deleteFn).toHaveBeenCalledWith("c1");
  expect(onSelect).not.toHaveBeenCalled();

  row.focus();
  await user.keyboard("{Enter}");
  expect(onSelect).toHaveBeenCalledWith("c1");
});
