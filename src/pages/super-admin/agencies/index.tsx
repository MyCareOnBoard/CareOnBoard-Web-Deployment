import React, {useState} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Plus, Building2, User, Mail, Phone, MapPin, FileText, RefreshCw, Eye, EyeOff} from "lucide-react";
import {useToast} from "@/hooks/use-toast";
import {UserType} from "@/utils/auth/types/user.types";
import {useCreateAgencyWithUserMutation, useListAllAgenciesQuery} from "./api";

interface AgencyFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  website: string;
  description: string;
  taxId: string;
  npi: string;
  licenseNumber: string;
}

interface UserFormData {
  fullName: string;
  email: string;
  password: string;
  phone: string;
}

export default function AgenciesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {toast} = useToast();
  
  const {data: agencies, isLoading: loadingAgencies} = useListAllAgenciesQuery({limit: 100});
  const [createAgencyWithUser, {isLoading: creating}] = useCreateAgencyWithUserMutation();

  const [agencyForm, setAgencyForm] = useState<AgencyFormData>({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    website: "",
    description: "",
    taxId: "",
    npi: "",
    licenseNumber: "",
  });

  const [userForm, setUserForm] = useState<UserFormData>({
    fullName: "",
    email: "",
    password: "",
    phone: "",
  });

  const handleAgencyInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const {name, value} = e.target;
    setAgencyForm(prev => ({...prev, [name]: value}));
  };

  const handleUserInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {name, value} = e.target;
    setUserForm(prev => ({...prev, [name]: value}));
  };

  const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setUserForm(prev => ({...prev, password}));
    setShowPassword(true);
    toast({
      title: "Password Generated",
      description: "A secure password has been generated",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createAgencyWithUser({
        agency: agencyForm,
        user: {
          ...userForm,
          userType: UserType.AGENCY,
        },
      }).unwrap();

      toast({
        title: "Success",
        description: "Agency and user created successfully",
      });
      
      setShowCreateModal(false);
      setAgencyForm({
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        website: "",
        description: "",
        taxId: "",
        npi: "",
        licenseNumber: "",
      });
      setUserForm({
        fullName: "",
        email: "",
        password: "",
        phone: "",
      });
      setShowPassword(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error || error?.message || "Failed to create agency",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
            Agency Management
          </h1>
          <p className="text-[14px] font-medium text-[#808081] mt-2">
            Create and manage agencies
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full px-6 py-3 h-auto font-semibold shadow-sm"
        >
          <Plus className="w-5 h-5"/>
          Create Agency
        </Button>
      </div>

      <div className="rounded-[20px] bg-[#FFFFFF4D] p-6 shadow-sm border border-white">
        <h2 className="text-xl font-bold text-[#10141a] mb-6">Agencies</h2>
        
        {agencies && agencies.agencies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agencies.agencies.map((agency) => (
              <div
                key={agency.id}
                className="bg-white rounded-lg p-4 shadow-sm border border-[#e5e5e6]"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#00b4b8]/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6 text-[#00b4b8]"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[#10141a] truncate">{agency.name}</h3>
                    <p className="text-sm text-[#808081] truncate">{agency.email}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          agency.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {agency.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-[#808081] mx-auto mb-4"/>
            <p className="text-[#808081]">No agencies created yet</p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[20px] max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-[#e5e5e6] px-6 py-4 rounded-t-[20px]">
              <h2 className="text-2xl font-bold text-[#10141a]">Create New Agency</h2>
              <p className="text-sm text-[#808081] mt-1">
                Create an agency and assign an admin user
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <h3 className="text-lg font-semibold text-[#10141a] mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5"/>
                    Agency Information
                  </h3>
                </div>

                <div>
                  <Label htmlFor="name" className={"mb-2"}>Agency Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={agencyForm.name}
                    onChange={handleAgencyInputChange}
                    required
                    placeholder="Enter agency name"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className={"mb-2"}>Agency Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={agencyForm.email}
                    onChange={handleAgencyInputChange}
                    required
                    placeholder="agency@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className={"mb-2"}>Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={agencyForm.phone}
                    onChange={handleAgencyInputChange}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <Label htmlFor="website" className={"mb-2"}>Website</Label>
                  <Input
                    id="website"
                    name="website"
                    value={agencyForm.website}
                    onChange={handleAgencyInputChange}
                    placeholder="https://example.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="address" className={"mb-2"}>Address</Label>
                  <Input
                    id="address"
                    name="address"
                    value={agencyForm.address}
                    onChange={handleAgencyInputChange}
                    placeholder="Street address"
                  />
                </div>

                <div>
                  <Label htmlFor="city" className={"mb-2"}>City</Label>
                  <Input
                    id="city"
                    name="city"
                    value={agencyForm.city}
                    onChange={handleAgencyInputChange}
                    placeholder="City"
                  />
                </div>

                <div>
                  <Label htmlFor="state" className={"mb-2"}>State</Label>
                  <Input
                    id="state"
                    name="state"
                    value={agencyForm.state}
                    onChange={handleAgencyInputChange}
                    placeholder="State"
                  />
                </div>

                <div>
                  <Label htmlFor="zipCode" className={"mb-2"}>ZIP Code</Label>
                  <Input
                    id="zipCode"
                    name="zipCode"
                    value={agencyForm.zipCode}
                    onChange={handleAgencyInputChange}
                    placeholder="12345"
                  />
                </div>

                <div>
                  <Label htmlFor="taxId" className={"mb-2"}>Tax ID</Label>
                  <Input
                    id="taxId"
                    name="taxId"
                    value={agencyForm.taxId}
                    onChange={handleAgencyInputChange}
                    placeholder="XX-XXXXXXX"
                  />
                </div>

                <div>
                  <Label htmlFor="npi" className={"mb-2"}>NPI</Label>
                  <Input
                    id="npi"
                    name="npi"
                    value={agencyForm.npi}
                    onChange={handleAgencyInputChange}
                    placeholder="National Provider Identifier"
                  />
                </div>

                <div>
                  <Label htmlFor="licenseNumber" className={"mb-2"}>License Number</Label>
                  <Input
                    id="licenseNumber"
                    name="licenseNumber"
                    value={agencyForm.licenseNumber}
                    onChange={handleAgencyInputChange}
                    placeholder="License number"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="description" className={"mb-2"}>Description</Label>
                  <textarea
                    id="description"
                    name="description"
                    value={agencyForm.description}
                    onChange={handleAgencyInputChange}
                    className="w-full min-h-[100px] px-3 py-2 border border-[#e5e5e6] rounded-md focus:outline-none focus:ring-2 focus:ring-[#00b4b8]"
                    placeholder="Agency description"
                  />
                </div>

                <div className="md:col-span-2 mt-6">
                  <h3 className="text-lg font-semibold text-[#10141a] mb-4 flex items-center gap-2">
                    <User className="w-5 h-5"/>
                    Agency Admin User
                  </h3>
                </div>

                <div>
                  <Label htmlFor="userFullName" className={"mb-2"}>Full Name *</Label>
                  <Input
                    id="userFullName"
                    name="fullName"
                    value={userForm.fullName}
                    onChange={handleUserInputChange}
                    required
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <Label htmlFor="userEmail" className={"mb-2"}>Email *</Label>
                  <Input
                    id="userEmail"
                    name="email"
                    type="email"
                    value={userForm.email}
                    onChange={handleUserInputChange}
                    required
                    placeholder="admin@example.com"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="userPassword">Password *</Label>
                    <Button
                      type="button"
                      onClick={generatePassword}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                    >
                      <RefreshCw className="w-3 h-3"/>
                      Generate
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      id="userPassword"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={userForm.password}
                      onChange={handleUserInputChange}
                      required
                      placeholder="Minimum 6 characters"
                      minLength={6}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="userPhone" className={"mb-2"}>Phone</Label>
                  <Input
                    id="userPhone"
                    name="phone"
                    value={userForm.phone}
                    onChange={handleUserInputChange}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-[#e5e5e6]">
                <Button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  variant="outline"
                  className="px-6"
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#00b4b8] hover:bg-[#009da1] text-white px-6"
                  disabled={creating}
                >
                  {creating ? "Creating..." : "Create Agency"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
