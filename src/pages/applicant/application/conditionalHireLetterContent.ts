/**
 * Conditional-hire letter content, keyed by applicant type.
 *
 * The DSP variant is the current ConditionalHireStep letter copy VERBATIM
 * (moved here, no wording change) so DSP behaviour is preserved exactly.
 *
 * The HHA variant mirrors the same structure but with "Caregiver" role wording
 * instead of "Staff member", and HHA-appropriate conditions, health clearances,
 * pre-service training, consent, and acknowledgement copy (New Jersey Certified
 * Homemaker–Home Health Aide context). The items align with the HHA applicant
 * document set (CHHA certificate, CPR certification, physical exam, TB test, MMR,
 * vaccination records). Agencies may further customise this text.
 *
 * Call sites resolve the applicant's type (default "dsp") and pass the matching
 * content to the renderer. `{agency}` is substituted at render time.
 */

export type ApplicantType = "dsp" | "hha";

/** A heading followed by a bullet list (used for the conditions sub-sections). */
export interface LetterListSection {
  /** Heading shown above the list, e.g. "1. Pre-Employment Screening & Background Checks". */
  heading: string;
  /** Optional intro paragraph rendered between the heading and the list. */
  intro?: string;
  /** Bullet items. */
  items: string[];
  /**
   * Free-text body rendered instead of a bullet list (e.g. "Documentation &
   * Compliance" which references the agency name). When present, `items` is ignored.
   * The literal token `{agency}` is replaced with the agency name at render time.
   */
  body?: string;
}

export interface ConditionalHireLetterContent {
  /** Role wording used in the intro and next-steps paragraphs (e.g. "Staff member" / "Caregiver"). */
  roleWording: string;
  /** Conditions-of-employment sub-sections. */
  conditions: LetterListSection[];
  /** Consent-for-pre-employment-checks bullet list. */
  consentItems: string[];
  /** At-will / rescission warning bullet list. */
  warningItems: string[];
}

/* ──────────────────────────────────────────────────────────────────────────
 * DSP variant — VERBATIM current copy (do not change wording).
 * ────────────────────────────────────────────────────────────────────────── */

const DSP_CONTENT: ConditionalHireLetterContent = {
  roleWording: "Staff member",
  conditions: [
    {
      heading: "1. Pre-Employment Screening & Background Checks",
      items: [
        "Fingerprint-based criminal history check (State & FBI)",
        "Central Registry - Child Abuse Record Information (CARI) check",
        "Sex Offender Registry check",
        "OIG Exclusion List check",
        "Drug screening (if applicable)",
        "Verification of professional references",
      ],
    },
    {
      heading: "2. Pre-Service Training",
      intro:
        "You must complete all CDS Portal modules and agency pre-service trainings prior to working independently. This includes, but is not limited to:",
      items: [
        "CDS-required modules (Introduction to DD, Person-Centered Planning, Everyone Can Communicate, etc.)",
        "Mandated Reporter Training (CPR/First Aid, Fire Safety, Infection Control, HIPAA, Orientation, etc.)",
        "NT-specific law trainings (Incident Reporting, Daniel's Law, Kimone's Law, etc.)",
      ],
    },
    {
      heading: "3. Documentation & Compliance",
      items: [],
      body:
        "All certificates, verifications, and required documentation must be submitted and approved by {agency} before your conditional employment status can be converted to regular employment.",
    },
  ],
  consentItems: [
    "Submission of your fingerprints for state and federal criminal history checks",
    "Review of your screening, including Central Registry, CARI, Sex Offender Registry, and OIG Exclusion List verification",
    "Drug testing (if applicable)",
    "Verification of education, certifications, and professional references",
  ],
  warningItems: [
    "Any of the pre-employment checks or screenings return unsatisfactory results",
    "You fail to complete required pre-service trainings within the stipulated time",
    "You provide false, misleading, or incomplete information during the application or hiring process",
  ],
};

/* ──────────────────────────────────────────────────────────────────────────
 * HHA variant — "Caregiver" role wording, HHA-appropriate content.
 *
 * Conditions, health clearances, training, consent, and acknowledgements are
 * tailored to Home Health Aide hiring (NJ Certified Homemaker–Home Health Aide)
 * and align with the HHA applicant document set. DDD-only items (CDS Portal
 * modules, Introduction to DD, CARI, Daniel's/Kimone's Law) are intentionally
 * omitted. Agencies may further customise this copy.
 * ────────────────────────────────────────────────────────────────────────── */

const HHA_CONTENT: ConditionalHireLetterContent = {
  roleWording: "Caregiver",
  conditions: [
    {
      heading: "1. Pre-Employment Screening & Background Checks",
      items: [
        "Criminal history background check, including State and FBI fingerprint-based screening",
        "Verification of your active CHHA (Certified Homemaker–Home Health Aide) certification in good standing with the New Jersey Board of Nursing",
        "OIG/SAM exclusion list verification (eligibility to participate in federal health care programs)",
        "Applicable abuse, neglect, and exploitation registry checks",
        "Drug screening (if applicable)",
        "Verification of professional references",
      ],
    },
    {
      heading: "2. Health Clearance & Pre-Service Training",
      intro:
        "Before being assigned to provide client care, you must complete the following health clearances and agency pre-service trainings. This includes, but is not limited to:",
      items: [
        "Health clearances: a current physical examination, TB test (or chest x-ray), MMR immunity, and any additional required immunization/vaccination records",
        "A current CPR/First Aid certification",
        "Home Health Aide competency evaluation and skills validation",
        "Agency orientation and in-service trainings (HIPAA, infection control, bloodborne pathogens/OSHA, patient rights, abuse and neglect reporting, and emergency preparedness)",
      ],
    },
    {
      heading: "3. Documentation & Compliance",
      items: [],
      body:
        "All certifications, health clearances, verifications, and required documentation must be submitted and approved by {agency} before your conditional employment status can be converted to regular employment.",
    },
  ],
  consentItems: [
    "Submission of your fingerprints for State and federal criminal history checks",
    "Review of your screening results, including criminal history, OIG/SAM exclusion, and applicable abuse, neglect, and exploitation registry checks",
    "Verification of your CHHA certification, CPR certification, education, and professional references",
    "Release and review of your health and immunization records (physical examination, TB test, MMR, and other vaccinations) to confirm fitness for duty",
    "Drug testing (if applicable)",
  ],
  warningItems: [
    "Any of the pre-employment checks or screenings return unsatisfactory results",
    "Your CHHA certification, CPR certification, or required health clearances are not valid, current, or in good standing",
    "You fail to complete the required health clearances, competency evaluation, or pre-service trainings within the stipulated time",
    "You provide false, misleading, or incomplete information during the application or hiring process",
  ],
};

const CONTENT_BY_TYPE: Record<ApplicantType, ConditionalHireLetterContent> = {
  dsp: DSP_CONTENT,
  hha: HHA_CONTENT,
};

/**
 * Resolve the conditional-hire letter content for an applicant type.
 * Defaults to the DSP variant for unknown/missing types (no DSP regression).
 */
export function getConditionalHireLetterContent(
  type: ApplicantType | string | undefined,
): ConditionalHireLetterContent {
  if (type === "hha") return HHA_CONTENT;
  return CONTENT_BY_TYPE.dsp;
}
