import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router";
import { AlertCircle, Info, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Routes } from "@/routes/constants";
import {
  arePaymentFormValuesDirty,
  buildUpdatePayload,
  CARD_BRAND_OPTIONS,
  createPaymentFormSchema,
  extractPaymentDetailsValidationErrors,
  getAccountNumberLast4,
  getDspPaymentDetails,
  mapPaymentDetailsToFormValues,
  type DspPaymentDetails,
  type PaymentFormValues,
  updateDspPaymentDetails,
} from "@/lib/api/paymentDetails";
import SuccessModal from "./SuccessModal";

const DEFAULT_FORM_VALUES: PaymentFormValues = {
  paymentMethod: "direct_deposit",
  bankName: "",
  accountHolderName: "",
  routingNumber: "",
  accountNumber: "",
  cardBrand: "",
  cardLast4: "",
};

interface PaymentTabProps {
  cachedDetails: DspPaymentDetails | null;
  onCacheUpdate: (details: DspPaymentDetails) => void;
}

export default function PaymentTab({ cachedDetails, onCacheUpdate }: PaymentTabProps) {
  const [loading, setLoading] = useState(!cachedDetails);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [savedDetails, setSavedDetails] = useState<DspPaymentDetails | null>(cachedDetails);
  const [initialValues, setInitialValues] = useState<PaymentFormValues>(
    cachedDetails ? mapPaymentDetailsToFormValues(cachedDetails) : DEFAULT_FORM_VALUES,
  );
  const [hasExistingRouting, setHasExistingRouting] = useState(
    Boolean(cachedDetails?.hasExistingRouting),
  );
  const [hasExistingAccount, setHasExistingAccount] = useState(
    Boolean(cachedDetails?.hasExistingAccount),
  );
  const [mailingAddressPreview, setMailingAddressPreview] = useState<string | null>(
    cachedDetails?.mailingAddressPreview ?? null,
  );

  const resolver = useMemo(
    () => zodResolver(createPaymentFormSchema(hasExistingRouting, hasExistingAccount)),
    [hasExistingRouting, hasExistingAccount],
  );

  const form = useForm<PaymentFormValues>({
    mode: "onSubmit",
    reValidateMode: "onBlur",
    resolver,
    defaultValues: initialValues,
  });

  const paymentMethod = useWatch({ control: form.control, name: "paymentMethod" });
  const watchedValues = useWatch({ control: form.control });

  const applyDetails = useCallback(
    (details: DspPaymentDetails) => {
      const nextValues = mapPaymentDetailsToFormValues(details);
      setSavedDetails(details);
      setHasExistingRouting(Boolean(details.hasExistingRouting));
      setHasExistingAccount(Boolean(details.hasExistingAccount));
      setMailingAddressPreview(details.mailingAddressPreview ?? null);
      setInitialValues(nextValues);
      form.reset(nextValues);
      onCacheUpdate(details);
    },
    [form, onCacheUpdate],
  );

  useEffect(() => {
    if (cachedDetails) {
      applyDetails(cachedDetails);
      setLoading(false);
      return;
    }

    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const details = await getDspPaymentDetails();
        if (!mounted) return;
        applyDetails(details);
      } catch (loadError) {
        console.error(loadError);
        if (mounted) {
          setError("We couldn't load your payroll details. Try again in a moment.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [cachedDetails, applyDetails]);

  useEffect(() => {
    form.clearErrors();
  }, [paymentMethod, form]);

  const hasChanges = useMemo(() => {
    if (!watchedValues) return false;
    return arePaymentFormValuesDirty(
      watchedValues as PaymentFormValues,
      initialValues,
      hasExistingRouting,
      hasExistingAccount,
    );
  }, [watchedValues, initialValues, hasExistingRouting, hasExistingAccount]);

  const accountNumberLast4 = getAccountNumberLast4(savedDetails?.accountNumberMasked);

  const handleSave = async (values: PaymentFormValues) => {
    if (saving) return;

    setSaving(true);
    setError("");

    try {
      const updated = await updateDspPaymentDetails(buildUpdatePayload(values));
      applyDetails({
        ...updated,
        mailingAddressPreview:
          updated.mailingAddressPreview ?? mailingAddressPreview ?? null,
      });
      setIsModalVisible(true);
    } catch (saveError) {
      console.error(saveError);
      const validationErrors = extractPaymentDetailsValidationErrors(saveError);
      if (validationErrors.length > 0) {
        validationErrors.forEach(({ field, message }) => {
          if (field in DEFAULT_FORM_VALUES) {
            form.setError(field as keyof PaymentFormValues, { message });
          }
        });
      } else {
        setError("We couldn't save your changes. Check your entries and try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (saving) return;
    form.reset(initialValues);
    setError("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white border rounded-lg">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#00b3ad]" />
          <p className="text-sm text-gray-500">Loading payroll details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h4 className="text-[20px] font-bold text-[#10141a] leading-[1.3]">
          How you get paid
        </h4>
        <p className="text-[#4f4f4f]">
          Choose where your agency sends your paycheck.
        </p>
      </div>

      {!savedDetails?.paymentMethod && (
        <div className="flex items-start gap-2 p-3 text-sm text-[#4f4f4f] rounded-lg bg-gray-100">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            You haven&apos;t set up a payout method yet. Choose one below so your
            agency knows where to send your pay.
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 text-sm text-red-600 rounded-lg bg-red-50">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
          <div className="grid gap-6 py-4 border-t border-gray-200 sm:grid-cols-2">
            <div>
              <h2 className="font-semibold text-lg text-[#10141a]">Payout method</h2>
              <p className="text-sm text-[#4f4f4f]">
                Select how you&apos;d like to receive pay. You can change this anytime.
              </p>
            </div>

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="space-y-3"
                      disabled={saving}
                    >
                      <label className="flex items-center gap-3 cursor-pointer">
                        <RadioGroupItem value="direct_deposit" />
                        <span className="text-sm text-[#10141a]">Direct deposit</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <RadioGroupItem value="check" />
                        <span className="text-sm text-[#10141a]">Paper check</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <RadioGroupItem value="debit_card" />
                        <span className="text-sm text-[#10141a]">Debit card</span>
                      </label>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {paymentMethod === "direct_deposit" && (
            <div className="grid gap-6 py-4 border-t border-gray-200 sm:grid-cols-2">
              <div>
                <h2 className="font-semibold text-lg text-[#10141a]">Bank details</h2>
                <p className="text-sm text-[#4f4f4f]">
                  Your bank details are encrypted and used only for payroll.
                </p>
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="bankName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank name</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={saving} autoComplete="organization" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accountHolderName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name on account</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={saving} autoComplete="name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="routingNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Routing number</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          disabled={saving}
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder={
                            savedDetails?.routingNumberMasked
                              ? `On file: ${savedDetails.routingNumberMasked}`
                              : "9-digit routing number"
                          }
                        />
                      </FormControl>
                      <p className="text-xs text-[#4f4f4f]">
                        9-digit number from your check or banking app.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account number</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          disabled={saving}
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder={
                            accountNumberLast4
                              ? `On file ending in ${accountNumberLast4}`
                              : "Account number"
                          }
                        />
                      </FormControl>
                      {accountNumberLast4 && (
                        <p className="text-xs text-[#4f4f4f]">
                          Leave blank to keep your account ending in{" "}
                          <strong>{accountNumberLast4}</strong>. Enter a new number only
                          if you want to update it.
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {paymentMethod === "debit_card" && (
            <div className="grid gap-6 py-4 border-t border-gray-200 sm:grid-cols-2">
              <div>
                <h2 className="font-semibold text-lg text-[#10141a]">Debit card</h2>
                <p className="text-sm text-[#4f4f4f]">
                  We only store your card type and last 4 digits for payroll.
                </p>
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="cardBrand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={saving}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select card type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CARD_BRAND_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cardLast4"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last 4 digits</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={saving}
                          inputMode="numeric"
                          maxLength={4}
                          autoComplete="off"
                          placeholder="1234"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {paymentMethod === "check" && (
            <div className="grid gap-6 py-4 border-t border-gray-200 sm:grid-cols-2">
              <div>
                <h2 className="font-semibold text-lg text-[#10141a]">Mailing address</h2>
                <p className="text-sm text-[#4f4f4f]">
                  Your paycheck will be mailed to the address on your profile.
                </p>
              </div>

              <div className="flex items-start gap-2 p-3 text-sm text-[#4f4f4f] rounded-lg bg-gray-100">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <p>
                    Your paycheck will be mailed to:{" "}
                    <strong>{mailingAddressPreview || "No address on file yet."}</strong>
                  </p>
                  <Link
                    to={Routes.userPanel.profile}
                    className="text-[#00b3ad] underline underline-offset-2"
                  >
                    Update your address
                  </Link>{" "}
                  if this is wrong.
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col justify-end gap-3 pt-6 border-t border-gray-200 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="border-[#00b3ad] text-[#00b3ad] hover:bg-[#00b3ad]/10 rounded-full"
              onClick={handleCancel}
              disabled={saving || !hasChanges}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              className="bg-[#00b3ad] text-white font-medium rounded-full hover:bg-[#00a39f] transition disabled:opacity-50"
              disabled={saving || !hasChanges}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </form>
      </Form>

      <SuccessModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        title="Payroll details saved"
        message="Your payout method is updated. Future paychecks will use these details."
      />
    </div>
  );
}
