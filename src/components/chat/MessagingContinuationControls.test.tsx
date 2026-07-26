import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/hooks/usePresence", () => ({
  useMultiplePresence: () => ({ presenceMap: {} }),
}));
vi.mock("@/hooks/useDebounce", () => ({
  useDebounce: (value: string) => value,
}));

import { ConversationList } from "./ConversationList";
import { NewMessageModal } from "./NewMessageModal";

describe("messaging continuation controls", () => {
  it("keeps sparse conversation continuation reachable from an empty window", () => {
    const loadMore = vi.fn().mockResolvedValue(undefined);

    render(
      <ConversationList
        conversations={[]}
        selectedConversationId={null}
        onSelectConversation={vi.fn()}
        currentUserId="super-1"
        hasMore
        onLoadMore={loadMore}
      />,
    );

    fireEvent.click(screen.getByRole("button", {
      name: "Load more conversations",
    }));
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it("keeps sparse contact continuation reachable from an empty search window", () => {
    const loadMore = vi.fn().mockResolvedValue(undefined);

    render(
      <NewMessageModal
        open
        onOpenChange={vi.fn()}
        isLoadingContacts={false}
        users={[]}
        onStartChat={vi.fn()}
        hasMoreUsers
        onLoadMoreUsers={loadMore}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Load more contacts" }));
    expect(loadMore).toHaveBeenCalledTimes(1);
  });
});
