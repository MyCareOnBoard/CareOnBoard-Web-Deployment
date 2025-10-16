import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import ApplicationDashboard from "./index";

describe("ApplicationDashboard", () => {
  it("renders without crashing", () => {
    render(<ApplicationDashboard />);
    expect(screen.getByRole("heading", { name: "Application" })).toBeInTheDocument();
  });

  it("renders the header", () => {
    render(<ApplicationDashboard />);
    expect(screen.getByRole("heading", { name: "Application" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Cancel Application Form" })).toBeVisible();
  });

  it("displays the stepper with all steps", () => {
    render(<ApplicationDashboard />);
    const stepper = screen.getByText("Profile & Pre-Screening").closest("div");
    expect(stepper).toBeTruthy();
    const stepperScope = stepper ? within(stepper) : screen;
    expect(stepperScope.getByText("Profile & Pre-Screening")).toBeInTheDocument();
    expect(stepperScope.getByText("Document Upload & Eligibility Verification")).toBeInTheDocument();
    expect(stepperScope.getByText("Conditional Hire & Compliance")).toBeInTheDocument();
    expect(stepperScope.getByText("Final Agency Review")).toBeInTheDocument();
    expect(stepperScope.getByText("Official Hire & Orientation")).toBeInTheDocument();
  });

  it("displays all form fields", () => {
    render(<ApplicationDashboard />);
    expect(screen.getByPlaceholderText("Enter full name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("November 14, 2025")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter Address")).toBeInTheDocument();
  });

  it("displays gender selection", () => {
    render(<ApplicationDashboard />);
    expect(screen.getByText("Gender")).toBeInTheDocument();
    expect(screen.getAllByText("Male")).toHaveLength(1);
    expect(screen.getAllByText("Female")).toHaveLength(1);
  });

  it("displays all pre-screening questions", () => {
    render(<ApplicationDashboard />);
    expect(screen.getByText("Are you at least 18 years old?")).toBeInTheDocument();
    expect(screen.getByText("Do you have a High School Diploma or GED?")).toBeInTheDocument();
    expect(screen.getByText("Are you legally eligible to work in the U.S.?")).toBeInTheDocument();
    expect(screen.getByText("Have you ever been convicted of a disqualifying offense under NJ law?")).toBeInTheDocument();
    expect(screen.getByText("Do you have reliable transportation?")).toBeInTheDocument();
  });

  it("displays resume upload section", () => {
    render(<ApplicationDashboard />);
    expect(screen.getByText("Upload Resume (Optional)")).toBeInTheDocument();
    expect(screen.getByText("Upload your resume")).toBeInTheDocument();
  });

  it("displays declaration checkbox", () => {
    render(<ApplicationDashboard />);
    expect(screen.getByText("I hereby declared that all the information are correct")).toBeInTheDocument();
  });

  it("displays Next button", () => {
    render(<ApplicationDashboard />);
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
  });

  it("renders only the first step content by default", () => {
    render(<ApplicationDashboard />);

    expect(screen.getByPlaceholderText("Enter full name")).toBeInTheDocument();
    expect(screen.getByText("Upload your resume")).toBeInTheDocument();
    expect(screen.queryByText("Upload identification (Driver’s license or Passport)")).not.toBeInTheDocument();
  });
});

