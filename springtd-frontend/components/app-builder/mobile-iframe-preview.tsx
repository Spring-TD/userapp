"use client"

interface MobileIframePreviewProps {
    templateId?: string;
    screenType?: "splash" | "onboarding" | "home";
}

/**
 * Renders an iframe preview of the actual mobile app pages.
 * Uses the real V1 (/mobile) or V2 (/mobile-v2) pages.
 */
export function MobileIframePreview({
    templateId = "mobile-v1",
    screenType = "splash"
}: MobileIframePreviewProps) {

    // Determine the correct URL based on template and screen type
    const getPreviewUrl = () => {
        const baseUrl = templateId === 'mobile-v2' ? '/mobile-v2' : '/mobile';

        // For splash/onboarding, both V1 and V2 landing pages show the splash/onboarding flow
        // The main page.tsx in each version handles this
        if (screenType === 'splash' || screenType === 'onboarding') {
            return baseUrl; // The landing page handles splash + onboarding
        }

        // For home screen preview
        if (screenType === 'home') {
            return `${baseUrl}/home`;
        }

        return baseUrl;
    };

    return (
        <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden border-8 border-gray-900 shadow-2xl bg-white">
            {/* Status Bar Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-xl z-30"></div>

            {/* Iframe Container */}
            <iframe
                src={getPreviewUrl()}
                className="w-full h-full border-0"
                title="Mobile App Preview"
                // Prevent navigation in the iframe
                sandbox="allow-scripts allow-same-origin"
            />
        </div>
    );
}
