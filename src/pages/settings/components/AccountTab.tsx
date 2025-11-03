import { useState, ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormMessage, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import SuccessModal from "./SuccessModal";

interface AccountFormValues {
  fullName: string;
  email: string;
}

export default function AccountTab({ onSave }: { onSave: () => void }) {
  const [selectedImage, setSelectedImage] = useState<string>("https://i.pravatar.cc/100");
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const form = useForm<AccountFormValues>({
    defaultValues: {
      fullName: "Remy",
      email: "remy@gmail.com",
    },
  });

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setTempImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (data: AccountFormValues) => {
    if (tempImage) {
      setSelectedImage(tempImage);
      setTempImage(null);
    }
    console.log("Saved data:", data);
    onSave();
    setIsModalVisible(true);
    setTimeout(() => setIsModalVisible(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h4 className="text-[20px] font-bold text-[#10141a] leading-[1.3]">Account Info</h4>
        <p className="text-[#4f4f4f]">
          Manage your personal details and secure your login credentials.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)}>
          {/* Profile Picture */}
          <div className="grid gap-6 py-4 border-t border-gray-200 sm:grid-cols-2">
            <div>
              <h2 className="font-semibold text-lg text-[#10141a]">Profile Picture</h2>
              <p className="text-sm text-[#4f4f4f]">
                Upload a photo so your team can recognize you.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <img
                src={tempImage || selectedImage}
                alt="Profile"
                className="object-cover w-14 h-14 rounded-full"
              />
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <label className="bg-[#00b3ad] hover:bg-[#00a39f] text-white font-medium px-5 py-2 rounded-full transition cursor-pointer">
                  Change Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
                <p className="text-sm text-[#4f4f4f]">We support JPG & PNG under 2MB</p>
              </div>
            </div>
          </div>

          {/* Full Name */}
          <div className="grid gap-6 py-4 border-t border-gray-200 sm:grid-cols-2">
            <div>
              <h2 className="font-semibold text-lg text-[#10141a]">Full Name</h2>
              <p className="text-sm text-[#4f4f4f]">
                This name will appear in your profile.
              </p>
            </div>

            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <Input placeholder="Enter full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Email */}
          <div className="grid gap-6 py-4 border-t border-gray-200 sm:grid-cols-2">
            <div>
              <h2 className="font-semibold text-lg text-[#10141a]">Email</h2>
              <p className="text-sm text-[#4f4f4f]">
                Used for login and receiving notifications.
              </p>
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <Input type="email" placeholder="Enter your email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Delete Account */}
          <div className="grid gap-6 pt-6 pb-6 border-t border-gray-200 sm:grid-cols-2">
            <div>
              <h2 className="font-semibold text-lg text-[#10141a]">Delete My Account</h2>
              <p className="text-sm text-[#4f4f4f]">Permanently delete the account.</p>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                className="bg-[#d93c24] hover:bg-[#c52d16] text-white font-medium px-5 py-2 rounded-full transition w-fit"
              >
                Delete Account
              </Button>
            </div>
          </div>

          {/* Save / Cancel Buttons */}
          <div className="flex flex-col justify-end gap-3 pt-6 border-t border-gray-200 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="border-[#00b3ad] text-[#00b3ad] hover:bg-[#00b3ad]/10 rounded-full"
              onClick={() => setTempImage(null)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              className="bg-[#00b3ad] text-white font-medium rounded-full hover:bg-[#00a39f] transition"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Form>

      {/* Success Modal */}
      <SuccessModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        closeButtonAriaLabel="Close" // <-- added prop for testing accessibility
      />
    </div>
  );
}
