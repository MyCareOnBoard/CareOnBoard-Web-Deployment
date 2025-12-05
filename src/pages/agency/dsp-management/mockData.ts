import { DSP, DSPListItem, Shift, Document, Client } from "./types";

// Mock DSPs with varied data
export const MOCK_DSPS: DSP[] = [
  {
    id: "dsp-1",
    fullName: "Nola Hawkins",
    role: "DSP",
    age: 30,
    status: "Active",
    email: "nola.hawkins@example.com",
    phone: "+1 234 567 8900",
    address: "6391 Elgin St. Celina, Delaware 10299",
    joiningDate: "March 15, 2020",
    professionalSummary: "I am a highly dedicated receptionist with 4+ years of experience ensuring smooth front-desk operations, patient scheduling.",
    gender: "Female",
  },
  {
    id: "dsp-2",
    fullName: "Marcus Thompson",
    role: "DSP",
    age: 28,
    status: "Active",
    email: "marcus.thompson@example.com",
    phone: "+1 234 567 8901",
    address: "2234 Oak Avenue, Springfield, Illinois 62701",
    joiningDate: "June 10, 2021",
    professionalSummary: "Experienced direct support professional with 5+ years working with individuals with developmental disabilities. Passionate about promoting independence.",
    gender: "Male",
  },
  {
    id: "dsp-3",
    fullName: "Sarah Martinez",
    role: "DSP",
    age: 35,
    status: "Active",
    email: "sarah.martinez@example.com",
    phone: "+1 234 567 8902",
    address: "789 Pine Road, Austin, Texas 78701",
    joiningDate: "January 5, 2019",
    professionalSummary: "Certified nursing assistant with extensive experience in personal care and medication management. Dedicated to improving quality of life for clients.",
    gender: "Female",
  },
  {
    id: "dsp-4",
    fullName: "David Chen",
    role: "DSP",
    age: 32,
    status: "Active",
    email: "david.chen@example.com",
    phone: "+1 234 567 8903",
    address: "456 Maple Drive, Seattle, Washington 98101",
    joiningDate: "September 20, 2020",
    professionalSummary: "Skilled in behavioral support and crisis intervention. 6+ years of experience working with diverse populations and complex needs.",
    gender: "Male",
  },
  {
    id: "dsp-5",
    fullName: "Emily Rodriguez",
    role: "DSP",
    age: 27,
    status: "Deactivated",
    email: "emily.rodriguez@example.com",
    phone: "+1 234 567 8904",
    address: "1122 Cedar Lane, Portland, Oregon 97201",
    joiningDate: "April 12, 2022",
    professionalSummary: "Compassionate caregiver specializing in dementia care and memory support. Strong communication and patience skills.",
    gender: "Female",
  },
  {
    id: "dsp-6",
    fullName: "James Wilson",
    role: "DSP",
    age: 41,
    status: "Deactivated",
    email: "james.wilson@example.com",
    phone: "+1 234 567 8905",
    address: "3344 Birch Street, Denver, Colorado 80201",
    joiningDate: "November 8, 2018",
    professionalSummary: "Veteran DSP with 12+ years of experience. Expertise in community integration and employment support services.",
    gender: "Male",
  },
  {
    id: "dsp-7",
    fullName: "Jessica Brown",
    role: "DSP",
    age: 29,
    status: "Deactivated",
    email: "jessica.brown@example.com",
    phone: "+1 234 567 8906",
    address: "5566 Willow Court, Miami, Florida 33101",
    joiningDate: "July 25, 2021",
    professionalSummary: "Detail-oriented support professional with background in occupational therapy assistance. Focused on skill development and independence.",
    gender: "Female",
  },
  {
    id: "dsp-8",
    fullName: "Robert Anderson",
    role: "DSP",
    age: 38,
    status: "Deactivated",
    email: "robert.anderson@example.com",
    phone: "+1 234 567 8907",
    address: "7788 Elm Boulevard, Boston, Massachusetts 02101",
    joiningDate: "February 14, 2020",
    professionalSummary: "Experienced in residential support and daily living assistance. Strong advocate for person-centered planning and self-determination.",
    gender: "Male",
  },
];

export const MOCK_DSP_LIST: DSPListItem[] = [
  { ...MOCK_DSPS[0], clients: 40, training: "5(12)" },
  { ...MOCK_DSPS[1], clients: 35, training: "8(12)" },
  { ...MOCK_DSPS[2], clients: 42, training: "12(12)" },
  { ...MOCK_DSPS[3], clients: 38, training: "10(12)" },
  { ...MOCK_DSPS[4], clients: 25, training: "3(12)" },
  { ...MOCK_DSPS[5], clients: 30, training: "5(12)" },
  { ...MOCK_DSPS[6], clients: 28, training: "4(12)" },
  { ...MOCK_DSPS[7], clients: 33, training: "7(12)" },
];

export const MOCK_SHIFTS: Shift[] = Array.from({ length: 6 }, (_, i) => ({
  id: `shift-${i + 1}`,
  clientName: "DR Brooklyn Simmons",
  clientImage: undefined,
  date: "12 January",
  location: "221/B Baker Street",
  clockIn: "2:30 PM",
  clockOut: "4:30 PM",
  duration: "2 hour session",
}));

export const MOCK_DOCUMENTS: Document[] = [
  { id: "doc-1", name: "Photo ID (Driver's License, State ID, Passport)", status: "Available" },
  { id: "doc-2", name: "Plans of Driver License (Part A - Report)", status: "Available" },
  { id: "doc-3", name: "Primo Monthly DAT", status: "Available" },
  { id: "doc-4", name: "Requests to instruction screen documents", status: "Available" },
  { id: "doc-5", name: "Requests to inventory (two week)", status: "Available" },
];

export const SHIFTS_CHART_DATA = [
  { day: "SUN", scheduled: 27, completed: 20 },
  { day: "MON", scheduled: 25, completed: 18 },
  { day: "TUES", scheduled: 30, completed: 22 },
  { day: "WED", scheduled: 28, completed: 25 },
  { day: "THURS", scheduled: 32, completed: 24 },
  { day: "FRI", scheduled: 28, completed: 20 },
  { day: "SAT", scheduled: 35, completed: 30 },
];

export const MOCK_CLIENTS: Client[] = [
  { id: "client-1", name: "DR Brooklyn Simmons", profileImage: undefined },
  { id: "client-2", name: "DR Sarah Johnson", profileImage: undefined },
  { id: "client-3", name: "DR Michael Brown", profileImage: undefined },
  { id: "client-4", name: "DR Emily Davis", profileImage: undefined },
];

export const CLOCK_IN_TIMES = [
  "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM",
  "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM",
];

export const CLOCK_OUT_TIMES = [
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM",
  "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM",
];
