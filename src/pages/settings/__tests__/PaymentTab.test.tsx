import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PaymentTab from "../components/PaymentTab";
import * as paymentDetailsApi from "@/lib/api/paymentDetails";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock("@/components/ui/loader", () => ({
  ButtonLoader: () => null,
  PageLoader: () => null,
}));

vi.mock("@/lib/api/paymentDetails", async (importOriginal) => {
  const actual = await importOriginal<typeof paymentDetailsApi>();
  return {
    ...actual,
    getDspPaymentDetails: vi.fn(),
    updateDspPaymentDetails: vi.fn(),
  };
});

describe("PaymentTab", () => {
  const cachedDetails = {
    paymentMethod: "direct_deposit" as const,
    bankName: "Test Bank",
    accountHolderName: "Test User",
    hasExistingRouting: true,
    hasExistingAccount: true,
    routingNumberMasked: "*****6789",
    accountNumberMasked: "****1234",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not fetch payment details on mount when cachedDetails is provided", async () => {
    render(
      <PaymentTab
        cachedDetails={cachedDetails}
        onCacheUpdate={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(paymentDetailsApi.getDspPaymentDetails).not.toHaveBeenCalled();
    });
  });

  it("does not re-fetch when parent cache updates after self-fetch", async () => {
    vi.mocked(paymentDetailsApi.getDspPaymentDetails).mockResolvedValue(cachedDetails);

    const onCacheUpdate = vi.fn();
    const { rerender } = render(
      <PaymentTab cachedDetails={null} onCacheUpdate={onCacheUpdate} />,
    );

    await waitFor(() => {
      expect(paymentDetailsApi.getDspPaymentDetails).toHaveBeenCalledTimes(1);
    });

    const updatedCache = {
      ...cachedDetails,
      bankName: "Updated Bank",
    };

    rerender(<PaymentTab cachedDetails={updatedCache} onCacheUpdate={onCacheUpdate} />);

    await waitFor(() => {
      expect(paymentDetailsApi.getDspPaymentDetails).toHaveBeenCalledTimes(1);
    });
  });

  it("shows API error when payment method is unavailable", async () => {
    vi.mocked(paymentDetailsApi.updateDspPaymentDetails).mockRejectedValue({
      response: {
        data: {
          error: "PAYMENT_METHOD_UNAVAILABLE",
          message: "This payout method is not available.",
        },
      },
    });

    render(
      <PaymentTab
        cachedDetails={cachedDetails}
        onCacheUpdate={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(paymentDetailsApi.getDspPaymentDetails).not.toHaveBeenCalled();
    });

    const user = userEvent.setup();
    const bankInput = await waitFor(() =>
      document.querySelector('input[autocomplete="organization"]') as HTMLInputElement,
    );
    await user.clear(bankInput);
    await user.type(bankInput, "New Bank Name");

    const saveButton = await waitFor(() =>
      Array.from(document.querySelectorAll("button")).find((btn) =>
        btn.textContent?.includes("Save changes"),
      ) as HTMLButtonElement,
    );
    await user.click(saveButton);

    await waitFor(() => {
      expect(document.body.textContent).toContain("This payout method is not available.");
    });
  });
});
