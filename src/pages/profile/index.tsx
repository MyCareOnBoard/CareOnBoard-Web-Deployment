import { useRef, useState, useEffect } from "react"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  X,
  Trash2,
  CalendarIcon,
  Plus,
  Building2,
  // Camera, // COMMENTED OUT - Image upload disabled
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"
import DatePicker from "react-datepicker"
import PhoneInput from "react-phone-number-input"
import "react-datepicker/dist/react-datepicker.css"
import "react-phone-number-input/style.css"
import { Routes } from "@/routes/constants"
import {
  getProfileInfo,
  updateProfileInfo,
  deleteAccount,
  // uploadProfilePicture, // COMMENTED OUT - Image upload disabled
  type ProfileInfo,
} from "@/lib/api/profile"
import { getAuth } from "firebase/auth"
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal"

function formatISODateToLong(iso: string) {
  if (!iso) return "N/A"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
}

function calcAge(iso: string) {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const diff = Date.now() - d.getTime()
  const ageDt = new Date(diff)
  return Math.abs(ageDt.getUTCFullYear() - 1970)
}

function formatUSPhone(e164: string) {
  if (!e164) return "N/A"
  const digits = e164.replace(/\D/g, "").slice(-10)
  if (digits.length !== 10) return e164
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

function formatFullAddress(profile: ProfileInfo): string {
  const parts = [
    profile.address,
    profile.city,
    profile.state,
    profile.zipCode
  ].filter(Boolean)
  
  if (parts.length === 0) return "Not provided"
  
  // Format: "123 Main St, Syracuse, Connecticut 35624"
  const streetAddress = profile.address || ""
  const cityStateZip = [profile.city, profile.state].filter(Boolean).join(", ")
  const fullCityStateZip = [cityStateZip, profile.zipCode].filter(Boolean).join(" ")
  
  return [streetAddress, fullCityStateZip].filter(Boolean).join(", ")
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const [showEdit, setShowEdit] = useState(false)
  const [formData, setFormData] = useState<Partial<ProfileInfo>>({})
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  // Profile data from API
  const [profile, setProfile] = useState<ProfileInfo | null>(null)

  // Image upload - COMMENTED OUT
  // const fileInputRef = useRef<HTMLInputElement>(null)
  const [photoPreview, setPhotoPreview] = useState<string>("")

  // Load profile data on mount
  useEffect(() => {
    loadProfileData()
  }, [])

  const loadProfileData = async () => {
    try {
      setLoading(true)
      setError("")
      
      console.log('🔄 Loading profile data...')
      const data = await getProfileInfo()
      
      console.log('📥 API returned:', data)
      
      // Fallback to Firebase auth if data is missing (matches AccountTab logic)
      let fullName = data.fullName || ""
      let email = data.email || ""
      let joiningDate = data.joiningDate || ""
      
      const auth = getAuth()
      await auth.authStateReady?.()
      const currentUser = auth.currentUser
      
      if (!fullName && currentUser?.displayName) {
        console.log("⚠️ Using Firebase displayName as fallback:", currentUser.displayName)
        fullName = currentUser.displayName
      }
      if (!email && currentUser?.email) {
        console.log("⚠️ Using Firebase email as fallback:", currentUser.email)
        email = currentUser.email
      }
      
      // If no joining date from API, use Firebase account creation date
      if (!joiningDate && currentUser?.metadata?.creationTime) {
        const creationDate = new Date(currentUser.metadata.creationTime)
        joiningDate = creationDate.toISOString().split('T')[0]
        console.log("⚠️ Using Firebase account creation date as joining date:", joiningDate)
        console.log("   Creation timestamp:", currentUser.metadata.creationTime)
      }

      const mergedProfile: ProfileInfo = {
        ...data,
        fullName,
        email,
        joiningDate,
      }

      console.log("✅ Merged profile data:")
      console.log("  - Full Name:", mergedProfile.fullName)
      console.log("  - Email:", mergedProfile.email)
      console.log("  - Phone:", mergedProfile.phone)
      console.log("  - Address:", mergedProfile.address)
      console.log("  - City:", mergedProfile.city)
      console.log("  - State:", mergedProfile.state)
      console.log("  - Zip Code:", mergedProfile.zipCode)
      console.log("  - Gender:", mergedProfile.gender)
      console.log("  - DOB:", mergedProfile.dateOfBirth)
      console.log("  - Joining Date:", mergedProfile.joiningDate)
      console.log("  - Profile Picture:", mergedProfile.profilePicture)
      console.log("  - Summary:", mergedProfile.summary)

      setProfile(mergedProfile)

      // Set photo preview - use empty string if no profile picture
      const profilePhoto = mergedProfile.profilePicture || ""
      setPhotoPreview(profilePhoto)
      console.log("🖼️ Set photo preview to:", profilePhoto || "(empty - will show placeholder)")

      // Initialize form data
      const initialData: Partial<ProfileInfo> = {
        fullName: mergedProfile.fullName || "",
        email: mergedProfile.email || "",
        phone: mergedProfile.phone || "",
        address: mergedProfile.address || "",
        city: mergedProfile.city || "",
        state: mergedProfile.state || "",
        zipCode: mergedProfile.zipCode || "",
        summary: mergedProfile.summary || "",
        gender: (mergedProfile.gender === "Male" || mergedProfile.gender === "Female") ? mergedProfile.gender : "Male",
        dateOfBirth: mergedProfile.dateOfBirth || "",
        joiningDate: mergedProfile.joiningDate || "",
        role: mergedProfile.role || "DSP",
      }

      setFormData(initialData)
      console.log("📝 Initialized form data:", initialData)

      // Set date picker
      if (mergedProfile.dateOfBirth) {
        const dateObj = new Date(mergedProfile.dateOfBirth)
        if (!isNaN(dateObj.getTime())) {
          setSelectedDate(dateObj)
          console.log("📅 Set date picker to:", dateObj)
        }
      }
    } catch (err: any) {
      console.error("❌ Failed to load profile:", err)
      setError(err?.message || "Failed to load profile information")
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = () => {
    if (!profile) {
      console.warn("⚠️ No profile data available")
      return
    }

    setShowEdit(true)
    setError("")

    // Re-initialize form data from current profile state
    const editFormData: Partial<ProfileInfo> = {
      fullName: profile.fullName || "",
      email: profile.email || "",
      phone: profile.phone || "",
      address: profile.address || "",
      city: profile.city || "",
      state: profile.state || "",
      zipCode: profile.zipCode || "",
      summary: profile.summary || "",
      gender: (profile.gender === "Male" || profile.gender === "Female") ? profile.gender : "Male",
      dateOfBirth: profile.dateOfBirth || "",
      joiningDate: profile.joiningDate || "",
      role: profile.role || "DSP",
    }

    setFormData(editFormData)

    // Re-set date picker
    if (profile.dateOfBirth) {
      const dateObj = new Date(profile.dateOfBirth)
      if (!isNaN(dateObj.getTime())) {
        setSelectedDate(dateObj)
      }
    }

    console.log("📝 Edit form initialized:", editFormData)
  }

  const handleSave = async () => {
    if (!profile) return

    console.log("💾 Starting save process...")
    console.log("💾 Current form data:", formData)

    // Validate required fields
    if (!formData.phone?.trim()) {
      setError("Phone number is required")
      return
    }
    if (!formData.address?.trim()) {
      setError("Street address is required")
      return
    }
    if (!formData.city?.trim()) {
      setError("City is required")
      return
    }
    if (!formData.state?.trim()) {
      setError("State is required")
      return
    }
    if (!formData.zipCode?.trim()) {
      setError("Zip code is required")
      return
    }
    if (!formData.gender) {
      setError("Gender is required")
      return
    }
    if (!selectedDate) {
      setError("Date of birth is required")
      return
    }

    setSaving(true)
    setError("")

    try {
      // Prepare update data with ALL fields to ensure persistence
      const updateData: Partial<ProfileInfo> = {
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        zipCode: formData.zipCode.trim(),
        gender: formData.gender,
        dateOfBirth: selectedDate.toISOString().split("T")[0],
        summary: formData.summary?.trim() || "",
        role: formData.role || profile.role || "DSP",
      }

      // Include fullName if provided
      if (formData.fullName !== undefined) {
        updateData.fullName = formData.fullName.trim()
      }

      // Include current photo to maintain it
      if (profile.profilePicture) {
        updateData.profilePicture = profile.profilePicture
      }
      
      // Include joining date to maintain it
      if (profile.joiningDate) {
        updateData.joiningDate = profile.joiningDate
      }

      console.log("📤 Sending update request with data:", updateData)

      await updateProfileInfo(updateData)

      console.log("✅ Profile updated successfully")

      // Reload profile data to ensure sync with server
      await loadProfileData()

      setShowEdit(false)
      setSuccess(true)

      // Hide success message after 2 seconds
      setTimeout(() => {
        setSuccess(false)
      }, 2000)
    } catch (err: any) {
      console.error("❌ Save failed:", err)
      setError(err?.message || "Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    setDeleting(true)
    setError("")

    try {
      await deleteAccount()
      console.log("✅ Account deleted successfully")
      
      // Clear auth and storage
      localStorage.clear()
      sessionStorage.clear()
      
      // Redirect to login
      navigate("/login", { replace: true })
    } catch (err: any) {
      console.error("❌ Delete failed:", err)
      
      // Show error message below the profile card, not in modal
      setError(err?.message || "Failed to delete account. Please try again or contact support.")
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-2 border-gray-300 rounded-full animate-spin border-t-[#00B4B8]"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md text-center">
          <div className="p-6 mb-4 text-red-600 bg-red-50 rounded-xl">
            <h3 className="mb-2 text-lg font-semibold">Error Loading Profile</h3>
            <p className="text-sm">{error}</p>
          </div>
          <div className="flex justify-center gap-3">
            <Button onClick={loadProfileData}>Retry</Button>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) return null

  const age = calcAge(profile.dateOfBirth)
  const joinLong = formatISODateToLong(profile.joiningDate || "")
  const dobLong = formatISODateToLong(profile.dateOfBirth)

  return (
    <div className="bg-[#EEF5F6] rounded-2xl min-h-[calc(100vh-100px)]">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-semibold text-gray-800">Profile</h2>
          <Button 
            onClick={() => navigate(Routes.application)}
            className="rounded-full bg-[#00B4B8] hover:bg-[#00a0a4] px-4 py-2 h-10 text-white gap-2"
          >
            <Plus size={16} />
            New Application
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 mb-6 text-red-600 bg-red-50 rounded-xl" role="alert">
            {error}
          </div>
        )}

        {/* Profile Card */}
        <div className="relative p-6 md:p-8 rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-gray-100">
          {/* Edit Button */}
          <button
            title="Edit Profile"
            className="absolute cursor-pointer top-5 right-5 bg-[#0F172A] text-white rounded-full hover:bg-[#1f2937] transition"
            onClick={handleEditClick}
          >
            <img
              src="/edit-outline.svg"
              alt="Edit Icon"
              className="w-10 h-10 mx-auto"
            />
          </button>

          {/* Header Section */}
          <div className="flex flex-col gap-6 mb-6 md:mb-8 md:flex-row md:items-center md:justify-start">
            {/* Image - Shows placeholder if no image */}
            <div className="relative group">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Profile"
                  className="object-cover border border-gray-100 w-28 h-28 md:w-32 md:h-32 rounded-2xl"
                  onError={(e) => {
                    console.error("❌ Image failed to load:", photoPreview)
                    // Set to empty to show placeholder
                    setPhotoPreview("")
                  }}
                />
              ) : (
                <div className="flex items-center justify-center bg-gray-100 border border-gray-200 w-28 h-28 md:w-32 md:h-32 rounded-2xl">
                  <User size={48} className="text-gray-400" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <span className="inline-block px-3 py-1 text-xs font-medium text-green-700 border border-green-300 rounded-full bg-green-50">
                Application Submitted
              </span>
              <h3 className="mt-2 text-2xl font-bold text-gray-900 md:text-3xl">
                {profile.fullName || "User"}
              </h3>
              <p className="text-sm text-gray-500 md:text-base">
                {profile.role || "DSP"}{age ? ` • ${age} yrs old` : ""}
              </p>
            </div>
          </div>

          {/* Info Rows */}
          <div className="space-y-3 md:space-y-4">
            <InfoRow icon={<User size={18} />} label="Full Name" value={profile.fullName || "Not provided"} />
            <InfoRow icon={<Mail size={18} />} label="Email" value={profile.email || "Not provided"} />
            <InfoRow
              icon={<Phone size={18} />}
              label="Phone number"
              value={profile.phone ? formatUSPhone(profile.phone) : "Not provided"}
            />
            <InfoRow icon={<MapPin size={18} />} label="Full Address" value={formatFullAddress(profile)} />
            <InfoRow icon={<Building2 size={18} />} label="City" value={profile.city || "Not provided"} />
            <InfoRow icon={<Building2 size={18} />} label="State" value={profile.state || "Not provided"} />
            <InfoRow icon={<Building2 size={18} />} label="Zip Code" value={profile.zipCode || "Not provided"} />
            <InfoRow icon={<Calendar size={18} />} label="Date of Birth" value={profile.dateOfBirth ? dobLong : "Not provided"} />
            <InfoRow icon={<Calendar size={18} />} label="Joining Date" value={profile.joiningDate ? joinLong : "Not provided"} />
            <InfoRow icon={<User size={18} />} label="Gender" value={profile.gender || "Not specified"} />

            {/* Professional Summary */}
            <div className="rounded-2xl bg-[#F4F8F8] ring-1 ring-gray-100 p-4">
              <div className="flex items-center gap-2 mb-3 text-gray-600">
                <span className="inline-flex items-center justify-center bg-white rounded-full w-9 h-9 ring-1 ring-gray-200">
                  <Briefcase size={18} />
                </span>
                <span className="text-sm font-medium">Professional summary</span>
              </div>
              <p className="text-sm leading-relaxed text-gray-800 md:text-base">
                {profile.summary || "No professional summary added yet. Click edit to add one."}
              </p>
            </div>
          </div>

          {/* Delete Button */}
          <div className="flex justify-end mt-6">
            <Button
              onClick={handleDeleteClick}
              variant="destructive"
              disabled={deleting}
              className="flex items-center gap-2 bg-[#d93c24] hover:bg-[#c52d16]"
            >
              <Trash2 size={16} />
              {deleting ? "Deleting..." : "Delete Account"}
            </Button>
          </div>
        </div>
      </div>

      {/* Slide-in Edit Drawer */}
      <AnimatePresence>
        {showEdit && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowEdit(false)
                setError("")
              }}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 bottom-0 right-0 z-50 w-full max-w-md overflow-y-auto bg-white shadow-2xl rounded-l-2xl">
              <div className="p-8 pb-24">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold">Update Account</h3>
                  <button
                    onClick={() => {
                      setShowEdit(false)
                      setError("")
                    }}
                    className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
            </button>
                </div>
                    
                <p className="mb-6 text-sm text-gray-500">Basic Info</p>

                {error && (
                  <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 rounded-xl" role="alert">
                    {error}
                  </div>
                )}

                <div className="space-y-5">
                  {/* Full Name - NOT REQUIRED */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Full Name
                    </label>
                    <Input
                      value={formData.fullName || ''}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="Enter your full name"
                    />
                  </div>

                  {/* Email Address - DISABLED & READ-ONLY */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      value={formData.email || ''}
                      disabled
                      readOnly
                      className="text-gray-500 cursor-not-allowed bg-gray-50"
                      title="Email cannot be changed"
                    />
                    <p className="mt-1 text-xs text-gray-500">Email address cannot be modified</p>
                  </div>

                  {/* Phone Number - REQUIRED */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <PhoneInput
                      international
                      defaultCountry="US"
                      value={formData.phone || ''}
                      onChange={(value) => setFormData({ ...formData, phone: value || '' })}
                      className="phone-input-custom"
                      required
                    />
                  </div>

                  {/* Street Address - REQUIRED */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Street Address <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="123 Main Street"
                      required
                    />
                  </div>

                  {/* City - REQUIRED */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      City <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formData.city || ''}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Syracuse"
                      required
                    />
                  </div>

                  {/* State and Zip Code - REQUIRED */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        State <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={formData.state || ''}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        placeholder="Connecticut"
                        required
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Zip Code <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={formData.zipCode || ''}
                        onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                        placeholder="35624"
                        maxLength={10}
                        required
                      />
                    </div>
                  </div>

                  {/* Date of Birth - REQUIRED */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <DatePicker
                        selected={selectedDate}
                        onChange={(date) => {
                          setSelectedDate(date)
                          if (date) {
                            setFormData({ ...formData, dateOfBirth: date.toISOString().split('T')[0] })
                          }
                        }}
                        dateFormat="yyyy-MM-dd"
                        className="w-full px-3 py-2 pr-10 text-sm border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#00B4B8]"
                        placeholderText="Select date of birth"
                        showYearDropdown
                        scrollableYearDropdown
                        yearDropdownItemNumber={100}
                        maxDate={new Date()}
                        required
                      />
                      <CalendarIcon
                        className="absolute text-gray-400 -translate-y-1/2 pointer-events-none right-3 top-1/2"
                        size={18}
                      />
                    </div>
                  </div>

                  {/* Gender - REQUIRED */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          checked={formData.gender === "Male"}
                          onChange={() => setFormData({ ...formData, gender: "Male" })}
                          className="w-4 h-4 accent-[#00B4B8]"
                          required
                        />
                        Male
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          checked={formData.gender === "Female"}
                          onChange={() => setFormData({ ...formData, gender: "Female" })}
                          className="w-4 h-4 accent-[#00B4B8]"
                          required
                        />
                        Female
                      </label>
                    </div>
                  </div>

                  {/* Professional Summary - NOT REQUIRED */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Professional Summary
                    </label>
                    <textarea
                      className="w-full p-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B4B8] resize-none"
                      rows={5}
                      value={formData.summary || ''}
                      onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                      placeholder="Tell us about your professional experience, skills, and career highlights..."
                      maxLength={500}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {(formData.summary || '').length}/500 characters
                    </p>
                  </div>
                </div>
              </div>

              {/* Buttons at Bottom */}
              <div className="sticky bottom-0 flex gap-3 p-6 bg-white border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEdit(false)
                    setError("")
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-[#00B4B8] hover:bg-[#009DA1]"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleting}
      />

      {/* Success Modal */}
      <AnimatePresence>
        {success && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="px-10 py-8 text-center bg-white shadow-lg rounded-xl"
            >
              <div className="flex justify-center mb-3">
                <div className="p-3 bg-green-100 rounded-full">
                  <span className="text-2xl text-green-600">✔</span>
                </div>
              </div>
              <h4 className="text-lg font-semibold">Profile Updated Successfully!</h4>
              <p className="mt-1 text-sm text-gray-500">Your changes have been saved.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Styles */}
      <style>{`
        .phone-input-custom .PhoneInputInput {
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          width: 100%;
          background: white;
        }
        .phone-input-custom .PhoneInputInput:focus {
          border-color: #00b4b8;
          box-shadow: 0 0 0 2px rgba(0, 180, 184, 0.15);
        }
        .phone-input-custom .PhoneInputCountry {
          margin-right: 0.5rem;
        }
        .react-datepicker-wrapper {
          width: 100%;
        }
      `}</style>
    </div>
  )
}

/* --- Subcomponent for Info Rows --- */
function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-[#F4F8F8] ring-1 ring-gray-100 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center text-gray-500 bg-white rounded-full w-9 h-9 ring-1 ring-gray-200">
          {icon}
        </span>
        <span className="text-sm font-medium text-gray-500">{label}</span>
      </div>
      <p className="text-sm text-right text-gray-800 md:text-base">{value}</p>
    </div>
  )
}

