import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router";
import { AlertCircle, Info, MapPin } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
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
import { useToast } from "@/hooks/use-toast";
import SettingsFormFieldRow from "@/pages/shared/settings/SettingsFormFieldRow";
import SettingsSectionCard from "@/pages/shared/settings/SettingsSectionCard";
import SettingsTabActions from "@/pages/shared/settings/SettingsTabActions";
import SettingsTabSkeleton from "@/pages/shared/settings/SettingsTabSkeleton";
import {
  settingsAlertErrorClass,
  settingsAlertInfoClass,
} from "@/pages/shared/settings/settingsCardStyles";
import {
  arePaymentFormValuesDirty,
  buildUpdatePayload,
  CARD_BRAND_OPTIONS,
  createPaymentFormSchema,
  extractPaymentDetailsApiError,
  extractPaymentDetailsValidationErrors,
  getAccountNumberLast4,
  getDspPaymentDetails,
  mapPaymentDetailsToFormValues,
  type DspPaymentDetails,
  type PaymentFormValues,
  updateDspPaymentDetails,
} from "@/lib/api/paymentDetails";

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
  const { toast } = useToast();
  const hasSelfFetchedRef = useRef(false);
  const [loading, setLoading] = useState(!cachedDetails);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
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

  const initialPaymentMethod = savedDetails?.paymentMethod ?? null;

  const resolver = useMemo(
    () =>
      zodResolver(
        createPaymentFormSchema(hasExistingRouting, hasExistingAccount, initialPaymentMethod),
      ),
    [hasExistingRouting, hasExistingAccount, initialPaymentMethod],
  );

  const form = useForm<PaymentFormValues>({
    mode: "onSubmit",
    reValidateMode: "onBlur",
    resolver,
    defaultValues: initialValues,
  });

  const [
    paymentMethod,
    bankName,
    accountHolderName,
    routingNumber,
    accountNumber,
    cardBrand,
    cardLast4,
  ] = useWatch({
    control: form.control,
    name: [
      "paymentMethod",
      "bankName",
      "accountHolderName",
      "routingNumber",
      "accountNumber",
      "cardBrand",
      "cardLast4",
    ],
  });

  const watchedValues = useMemo(
    (): PaymentFormValues => ({
      paymentMethod: paymentMethod ?? initialValues.paymentMethod,
      bankName: bankName ?? "",
      accountHolderName: accountHolderName ?? "",
      routingNumber: routingNumber ?? "",
      accountNumber: accountNumber ?? "",
      cardBrand: cardBrand ?? "",
      cardLast4: cardLast4 ?? "",
    }),
    [
      paymentMethod,
      bankName,
      accountHolderName,
      routingNumber,
      accountNumber,
      cardBrand,
      cardLast4,
      initialValues.paymentMethod,
    ],
  );

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
      if (!hasSelfFetchedRef.current) {
        applyDetails(cachedDetails);
        setLoading(false);
      }
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
        hasSelfFetchedRef.current = true;
      } catch {
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
    return arePaymentFormValuesDirty(
      watchedValues,
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
      hasSelfFetchedRef.current = true;
      toast({
        title: "Payroll details saved",
        description: "Your payout preference is updated.",
      });
    } catch (saveError) {
      const methodError = extractPaymentDetailsApiError(saveError);
      if (methodError) {
        setError(methodError);
        toast({
          title: "Couldn't save payroll details",
          description: methodError,
          variant: "destructive",
        });
      } else {
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
    return <SettingsTabSkeleton variant="form" cardCount={2} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {!savedDetails?.paymentMethod && (
        <div className={settingsAlertInfoClass}>
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#00b4b8]" />
          <span>
            You haven&apos;t set up a payout method yet. Choose one below so your agency knows
            where to send your pay.
          </span>
        </div>
      )}

      {error && (
        <div className={settingsAlertErrorClass}>
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="flex flex-col gap-4">
          <SettingsSectionCard
            title="Payout method"
            subtitle="Select how you'd like to receive pay. You can change this anytime."
          >
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex flex-wrap items-center gap-x-8 gap-y-3"
                      disabled={saving}
                    >
                      <label className="flex cursor-pointer items-center gap-3">
                        <RadioGroupItem value="direct_deposit" />
                        <span className="text-sm text-[#10141a]">Direct deposit</span>
                      </label>
                      <label className="flex cursor-not-allowed items-center gap-3 opacity-50">
                        <RadioGroupItem value="check" disabled />
                        <span className="text-sm text-[#808081]">Paper check</span>
                      </label>
                      <label className="flex cursor-not-allowed items-center gap-3 opacity-50">
                        <RadioGroupItem value="debit_card" disabled />
                        <span className="text-sm text-[#808081]">Debit card</span>
                      </label>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SettingsSectionCard>

          {paymentMethod === "direct_deposit" && (
            <SettingsSectionCard
              title="Bank details"
              subtitle="Your bank details are encrypted and used only for payroll."
            >
              <SettingsFormFieldRow title="Bank name">
                <FormField
                  control={form.control}
                  name="bankName"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormControl>
                        <Input {...field} disabled={saving} autoComplete="organization" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </SettingsFormFieldRow>

              <SettingsFormFieldRow title="Name on account">
                <FormField
                  control={form.control}
                  name="accountHolderName"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormControl>
                        <Input {...field} disabled={saving} autoComplete="name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </SettingsFormFieldRow>

              <SettingsFormFieldRow
                title="Routing number"
                description={
                  hasExistingRouting
                    ? "Leave blank to keep your current number on file."
                    : "9-digit number from your check or banking app."
                }
              >
                <FormField
                  control={form.control}
                  name="routingNumber"
                  render={({ field }) => (
                    <FormItem className="w-full">
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </SettingsFormFieldRow>

              <SettingsFormFieldRow
                title="Account number"
                description={
                  hasExistingAccount
                    ? "Leave blank to keep your current number on file."
                    : accountNumberLast4
                      ? `On file ending in ${accountNumberLast4}. Enter a new number only if you want to update it.`
                      : undefined
                }
              >
                <FormField
                  control={form.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem className="w-full">
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </SettingsFormFieldRow>
            </SettingsSectionCard>
          )}

          {paymentMethod === "debit_card" && (
            <SettingsSectionCard
              title="Debit card"
              subtitle="We only store your card type and last 4 digits for payroll."
            >
              <SettingsFormFieldRow title="Card type">
                <FormField
                  control={form.control}
                  name="cardBrand"
                  render={({ field }) => (
                    <FormItem className="w-full">
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
              </SettingsFormFieldRow>

              <SettingsFormFieldRow title="Last 4 digits">
                <FormField
                  control={form.control}
                  name="cardLast4"
                  render={({ field }) => (
                    <FormItem className="w-full">
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
              </SettingsFormFieldRow>
            </SettingsSectionCard>
          )}

          {paymentMethod === "check" && (
            <SettingsSectionCard
              title="Mailing address"
              subtitle="Payroll checks mail to the address on your profile."
            >
              <div className={settingsAlertInfoClass}>
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#00b4b8]" />
                <div className="space-y-2">
                  <p>
                    {mailingAddressPreview
                      ? `Checks will be mailed to: ${mailingAddressPreview}`
                      : "No address on file yet."}
                  </p>
                  <Link
                    to={Routes.userPanel.profile}
                    className="text-[#00b4b8] underline underline-offset-2"
                  >
                    Update profile address
                  </Link>
                </div>
              </div>
            </SettingsSectionCard>
          )}

          <SettingsTabActions
            hasChanges={hasChanges}
            saving={saving}
            onCancel={handleCancel}
            saveLabel="Save changes"
          />
        </form>
      </Form>
    </div>
  );
}
