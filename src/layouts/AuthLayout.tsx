import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router";
import QRCode from "react-qr-code";
import "@fontsource/urbanist/300.css";
import LogoNameIcon from "@/assets/icons/green-green-logo.svg?react";
import { getAgencyInfo } from "@/lib/api/onboarding";
import { Routes } from "@/routes/constants";

const PHOTOS = [
  { src: "/assets/family-care-couple.jpg", position: "45% center" },
  { src: "/assets/family-care-nurse.jpg", position: "62% center" },
  { src: "/healthcare-professional-ready.jpg", position: "center" },
];

// Faint vertical lines behind the panel content, as in the design.
const panelLines = {
  backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.055) 0 1px, transparent 1px 76px)",
};

/** QR card under every sign-in form. The link sends phones to the right app store. */
function AppDownloadCard() {
  const downloadUrl = `${window.location.origin}${Routes.mobileAppDownload}`;
  return (
    <div className="mt-8 flex items-center gap-4 border-t border-[#e3e8ea] pt-6 dark:border-white/10">
      <div className="shrink-0 rounded-[14px] border border-[#e3e8ea] bg-white p-2.5 dark:border-white/10">
        <QRCode value={downloadUrl} size={76} aria-label="QR code to download the Care on Board app" />
      </div>
      <div className="min-w-0">
        <p className="text-[18px] text-[#10141a] dark:text-[#f4f6f7]">Scan to download the app.</p>
        <p className="mt-1 text-[14px] leading-relaxed text-[#34434c] dark:text-[#9aa4a8]">
          Scan the QR code to access care updates and real-time support on the go.
        </p>
      </div>
    </div>
  );
}

function BrandPanel({ agency }: { agency: string }) {
  return (
    <aside className="relative hidden w-[55%] shrink-0 flex-col overflow-hidden rounded-[24px] bg-[#003839] p-8 text-white lg:sticky lg:top-4 lg:flex lg:h-[calc(100vh-32px)] xl:p-10">
      <div className="pointer-events-none absolute inset-0" style={panelLines} aria-hidden="true" />
      <div className="relative">
        <LogoNameIcon aria-label="Care on Board" role="img" className="h-auto w-[196px]" />
        {agency && <p className="mt-6 inline-flex rounded-full bg-white/10 px-3 py-1 text-[13px] text-white/90">Welcome to {agency}</p>}
        <h1 className="mt-8 text-[clamp(44px,4.6vw,72px)] font-light leading-[1.3] tracking-[-0.01em]">
          <span className="block text-[#22b8b6]">One Platform.</span>{" "}
          <span className="block">Complete Care</span>
        </h1>
        <p className="mt-6 max-w-[760px] text-[15px] leading-relaxed text-white/90">
          Simplify how care is managed, delivered, and experienced. CareOnboard unites staffing, coordination, billing,
          and compliance into one seamless, intelligent system so you can focus on what truly matters: people.
        </p>
      </div>
      <div className="relative mt-10 flex min-h-0 flex-1 gap-6" aria-hidden="true">
        {PHOTOS.map((photo, index) => (
          <img key={index} src={photo.src} alt="" loading="lazy" decoding="async" style={{ objectPosition: photo.position }}
            className="h-full max-h-[520px] min-h-0 w-[clamp(240px,40%,340px)] shrink-0 self-end rounded-[20px] object-cover" />
        ))}
      </div>
    </aside>
  );
}

export default function AuthLayout() {
  const [agency, setAgency] = useState("");
  const agencyId = new URLSearchParams(useLocation().search).get("agencyId");

  useEffect(() => {
    if (!agencyId || agencyId === "undefined") return;
    let live = true;
    getAgencyInfo(agencyId).then((info) => {
      if (live && info?.agency?.name) setAgency(info.agency.name);
    }).catch(() => undefined);
    return () => { live = false; };
  }, [agencyId]);

  useEffect(() => {
    document.body.classList.add("auth-layout-active");
    return () => document.body.classList.remove("auth-layout-active");
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-[#10141a]">
      <div className="flex min-h-screen w-full gap-4 p-4">
        <main className="flex min-w-0 flex-1 flex-col items-center justify-center px-2 py-8 sm:px-8">
          <div className="w-full min-w-0 max-w-[520px]">
            <LogoNameIcon aria-label="Care on Board" role="img" className="mb-10 h-auto w-[164px] lg:hidden" />
            <Outlet />
            <AppDownloadCard />
          </div>
        </main>
        <BrandPanel agency={agency} />
      </div>
    </div>
  );
}
