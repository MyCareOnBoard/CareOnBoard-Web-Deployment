import { useParams } from "react-router";

export default function MobileAppRedirect() {
  const { agencyId } = useParams<{ agencyId: string }>();

  const ua = navigator.userAgent;
  const isAndroid = /android/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isMobile = isAndroid || isIOS;

  const handleOpenApp = () => {
    const iosStore = import.meta.env.VITE_MOBILE_APP_IOS_STORE_URL || 'https://apps.apple.com/app/6760315221';
    const androidStore = import.meta.env.VITE_MOBILE_APP_ANDROID_STORE_URL || 'https://play.google.com/store/apps/details?id=com.iota.careonboardapplicant';

    if (!isMobile) {
      // For desktop, just redirect to app store
      window.open(iosStore, '_blank');
      return;
    }

    // For mobile, try deep link first
    const deepLinkScheme = import.meta.env.VITE_MOBILE_APP_DEEP_LINK_SCHEME || 'careonboardapplicant://register';
    const appDeepLink = `${deepLinkScheme}?t=${encodeURIComponent(agencyId || '')}`;

    try {
      window.location.href = appDeepLink;

      setTimeout(() => {
        if (isIOS) {
          window.location.href = iosStore;
        } else if (isAndroid) {
          window.location.href = androidStore;
        }
      }, 1200);
    } catch (error) {
      // If deep link fails, go directly to store
      if (isIOS) {
        window.location.href = iosStore;
      } else if (isAndroid) {
        window.location.href = androidStore;
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#00b4b8] to-[#0090a8]">
      <div className="max-w-md px-6 text-center text-white">
        <div className="mb-8">
          <svg className="w-24 h-24 mx-auto" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </div>
        <h1 className="mb-4 text-3xl font-bold">
          {isMobile ? 'Open CareOnboard App' : 'Download CareOnboard App'}
        </h1>
        <p className="mb-8 text-lg opacity-90">
          {isMobile 
            ? 'Click the button below to open the CareOnboard mobile app.'
            : 'This link is meant for mobile devices. Click below to view the app in the store.'}
        </p>
        <button
          onClick={handleOpenApp}
          className="bg-white text-[#00b4b8] font-semibold px-8 py-4 rounded-full text-lg hover:bg-opacity-90 transition-all shadow-lg"
        >
          {isMobile ? 'Open App' : 'View in App Store'}
        </button>
        <p className="mt-6 text-sm opacity-75">
          {isMobile 
            ? "If the app doesn't open, you'll be redirected to download it from your app store."
            : 'Please open this link on your mobile device to use the app.'}
        </p>
      </div>
    </div>
  );
}
