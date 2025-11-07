import { useRef, useState } from "react"
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
  Camera,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"
import DatePicker from "react-datepicker"
import PhoneInput from "react-phone-number-input"
import "react-datepicker/dist/react-datepicker.css"
import "react-phone-number-input/style.css"

function formatISODateToLong(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
}
function calcAge(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const diff = Date.now() - d.getTime()
  const ageDt = new Date(diff)
  return Math.abs(ageDt.getUTCFullYear() - 1970)
}
function formatUSPhone(e164: string) {
  const digits = e164.replace(/\D/g, "").slice(-10)
  if (digits.length !== 10) return e164
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

export default function ProfilePage() {
  const [showEdit, setShowEdit] = useState(false)
  const [formData, setFormData] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date("1994-05-15"))

  // Dummy profile data to match the design preview
  const profile = {
    photo: "https://i.pravatar.cc/300?img=47",
    name: "Nola Hawkins",
    dateOfBirth: "1994-05-15",
    gender: "Female",
    email: "kathryn.murp@example.com",
    phone: "+17045550127",
    address: "6391 Elgin St. Celina, Delaware 10299",
    joiningDate: "2020-03-15",
    summary:
      "Kathryn is a highly dedicated receptionist with 4+ years of experience ensuring smooth front-desk operations, patient scheduling.",
    role: "DSP",
  }

  // Image upload (UI only)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photoPreview, setPhotoPreview] = useState<string>(profile.photo)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [imgError, setImgError] = useState<string>("")
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  const handleImageClick = () => fileInputRef.current?.click()

  const simulateUpload = async () =>
    new Promise<void>((resolve) => {
      setUploading(true)
      setUploadProgress(0)
      const id = setInterval(() => {
        setUploadProgress((p) => {
          if (p >= 100) {
            clearInterval(id)
            setUploading(false)
            resolve()
            return 100
          }
          return p + 10
        })
      }, 80)
    })

  const onSelectImage: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImgError("")
    if (!file.type.startsWith("image/")) {
      setImgError("Please select an image file.")
      return
    }
    const maxBytes = 5 * 1024 * 1024
    if (file.size > maxBytes) {
      setImgError("Max file size is 5MB.")
      return
    }
    // preview
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    setPhotoPreview(url)
    // simulate upload
    await simulateUpload()
    // In real app, replace with actual upload and set the returned URL to photoPreview
  }

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      setShowEdit(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2500)
    }, 800)
  }

  const handleDelete = () => {
    if (!confirm("Are you sure you want to permanently delete your account?")) return
    setDeleting(true)
    setTimeout(() => {
      setDeleting(false)
      alert("Account deleted (simulated)")
    }, 900)
  }

  const age = calcAge(profile.dateOfBirth)
  const joinLong = formatISODateToLong(profile.joiningDate)
  const dobLong = formatISODateToLong(profile.dateOfBirth)

  return (
    <div className="p-6 sm:p-10 bg-[#EEF5F6] rounded-2xl min-h-[calc(100vh-100px)]">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-semibold text-gray-800">Dashboard</h2>
          <Button className="rounded-full bg-[#00B4B8] hover:bg-[#00a0a4] px-4 py-2 h-10 text-white gap-2">
            <Plus size={16} />
            New Application
          </Button>
        </div>

        {/* Profile Card */}
        <div className="relative p-6 md:p-8 rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-gray-100">
          {/* Edit Button */}
          <button
            title="Edit Profile"
            className="absolute cursor-pointer top-5 right-5 bg-[#0F172A] text-white rounded-full hover:bg-[#1f2937] transition"
            onClick={() => setShowEdit(true)}
          >
            <img 
              src="/edit-outline.svg"
              alt="Mail Verified Icon"
              className="w-10 h-10 mx-auto"
            />
          </button>

          {/* Header Section */}
          <div className="flex flex-col gap-6 mb-6 md:mb-8 md:flex-row md:items-center md:justify-start">
            {/* Image + upload overlay */}
            <div className="relative group">
              <img
                src={photoPreview}
                alt="Profile"
                className="object-cover border border-gray-100 w-28 h-28 md:w-32 md:h-32 rounded-2xl"
              />
              <button
                type="button"
                onClick={handleImageClick}
                className="absolute inset-0 flex items-end justify-end p-2 transition rounded-2xl bg-black/0 group-hover:bg-black/20"
                aria-label="Change profile photo"
                title="Change photo"
              >
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#0F172A] text-white ring-1 ring-white/20">
                  <Camera size={16} />
                </span>
              </button>

              {/* Uploading overlay */}
              {uploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black/40">
                  <div className="mb-2 border-2 rounded-full w-9 h-9 border-white/30 border-t-white animate-spin" />
                  <p className="text-xs text-white">{uploadProgress}%</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onSelectImage}
                className="hidden"
              />
              {imgError && <p className="mt-2 text-xs text-red-500">{imgError}</p>}
            </div>

            <div className="flex-1">
              <span className="inline-block px-3 py-1 text-xs font-medium text-green-700 border border-green-300 rounded-full bg-green-50">
                Application Submitted
              </span>
              <h3 className="mt-2 text-2xl font-bold text-gray-900 md:text-3xl">{profile.name}</h3>
              <p className="text-sm text-gray-500 md:text-base">
                {profile.role} • {age ? `${age} yrs old` : ""}
              </p>
            </div>
          </div>

          {/* Info Rows */}
          <div className="space-y-3 md:space-y-4">
            <InfoRow icon={<User size={18} />} label="Gender" value={profile.gender} />
            <InfoRow icon={<Mail size={18} />} label="Email" value={profile.email} />
            <InfoRow
              icon={<Phone size={18} />}
              label="Phone number"
              value={formatUSPhone(profile.phone)}
            />
            <InfoRow icon={<MapPin size={18} />} label="Address" value={profile.address} />
            <InfoRow icon={<Calendar size={18} />} label="Joining date" value={joinLong} />
            <InfoRow icon={<Calendar size={18} />} label="Date of Birth" value={dobLong} />
            <InfoRow
              icon={<Briefcase size={18} />}
              label="Professional summary"
              value={profile.summary}
              isSummary
            />
          </div>

          {/* Delete Button */}
          <div className="flex justify-end mt-6">
            <Button
              onClick={handleDelete}
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
              onClick={() => setShowEdit(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 bottom-0 right-0 z-50 w-full max-w-md overflow-y-auto bg-white shadow-2xl rounded-l-2xl"
            >
              <div className="p-8 pb-24">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold">Update Account</h3>
                  <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                  </button>
                </div>

                <p className="mb-6 text-sm text-gray-500">Basic Info</p>

                <div className="space-y-5">
                  {/* Full Name */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Full Name</label>
                    <Input
                      value={formData.name || profile.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter your full name"
                    />
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Date of Birth</label>
                    <div className="relative">
                      <DatePicker
                        selected={selectedDate}
                        onChange={(date) => {
                          setSelectedDate(date)
                          setFormData({ ...formData, dateOfBirth: date })
                        }}
                        dateFormat="yyyy-MM-dd"
                        className="w-full px-3 py-2 pr-10 text-sm border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#00B4B8]"
                        placeholderText="Select date of birth"
                        showYearDropdown
                        scrollableYearDropdown
                        yearDropdownItemNumber={100}
                        maxDate={new Date()}
                      />
                      <CalendarIcon
                        className="absolute text-gray-400 -translate-y-1/2 pointer-events-none right-3 top-1/2"
                        size={18}
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Email Address</label>
                    <Input
                      type="email"
                      value={formData.email || profile.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="your.email@example.com"
                    />
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Phone Number</label>
                    <PhoneInput
                      international
                      defaultCountry="US"
                      value={formData.phone || profile.phone}
                      onChange={(value) => setFormData({ ...formData, phone: value })}
                      className="phone-input-custom"
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Address</label>
                    <Input
                      value={formData.address || profile.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Enter your address"
                    />
                  </div>

                  {/* Professional Summary */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Professional Summary</label>
                    <textarea
                      className="w-full p-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B4B8]"
                      rows={4}
                      value={formData.summary || profile.summary}
                      onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                      placeholder="Tell us about your professional experience..."
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Gender</label>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          checked={(formData.gender || profile.gender) === "Male"}
                          onChange={() => setFormData({ ...formData, gender: "Male" })}
                          className="w-4 h-4 text-[#00B4B8] focus:ring-[#00B4B8]"
                        />
                        Male
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          checked={(formData.gender || profile.gender) === "Female"}
                          onChange={() => setFormData({ ...formData, gender: "Female" })}
                          className="w-4 h-4 text-[#00B4B8] focus:ring-[#00B4B8]"
                        />
                        Female
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Buttons at Bottom */}
              <div className="sticky bottom-0 flex gap-3 p-6 bg-white border-t">
                <Button variant="outline" onClick={() => setShowEdit(false)} className="flex-1">
                  Cancel
                </Button>
                <Button className="flex-1 bg-[#00B4B8] hover:bg-[#009DA1]" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
              <h4 className="text-lg font-semibold">Profile Updated</h4>
              <p className="mt-1 text-sm text-gray-500">You have successfully updated your profile</p>
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
  isSummary = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  isSummary?: boolean
}) {
  if (isSummary) {
    return (
      <div className="rounded-2xl bg-[#F4F8F8] ring-1 ring-gray-100 p-3">
        <div className="flex items-center gap-2 mb-2 text-gray-400">
          <span className="inline-flex items-center justify-center bg-white rounded-full w-9 h-9 ring-1 ring-gray-200">
            {icon}
          </span>
          <span className="text-sm font-medium">Professional summary</span>
        </div>
        <p className="text-sm text-gray-800 md:text-base">{value}</p>
      </div>
    )
  }

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

