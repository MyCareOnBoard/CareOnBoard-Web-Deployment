import { fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { upload } = vi.hoisted(() => ({ upload: vi.fn() }));

vi.mock("@/lib/api/userMessaging", () => ({
  useUploadAttachmentMutation: () => [upload],
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { MessageInput } from "./MessageInput";

describe("MessageInput attachment upload", () => {
  beforeEach(() => {
    upload.mockReset();
    upload.mockReturnValue({
      unwrap: () => Promise.resolve({
        data: {
          url: "https://example.test/file.txt",
          fileType: "text/plain",
          fileSize: 4,
        },
      }),
    });
  });

  it("passes the selected conversation ID to the upload mutation", async () => {
    const file = new File(["test"], "file.txt", { type: "text/plain" });
    const { container } = render(
      <MessageInput
        conversationId="conversation/a"
        onSend={vi.fn()}
      />,
    );

    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(upload).toHaveBeenCalledWith({
        conversationId: "conversation/a",
        file,
      });
    });
  });
});
