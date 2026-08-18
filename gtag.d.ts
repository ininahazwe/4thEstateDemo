/**
 * Typage minimal de gtag.js et du dataLayer, injectes par le script inline
 * du <head> (voir app/layout.tsx) puis par googletagmanager.com/gtag/js.
 */
type ConsentState = 'granted' | 'denied';

interface GtagConsentParams {
    ad_storage?: ConsentState;
    ad_user_data?: ConsentState;
    ad_personalization?: ConsentState;
    analytics_storage?: ConsentState;
    functionality_storage?: ConsentState;
    personalization_storage?: ConsentState;
    security_storage?: ConsentState;
    wait_for_update?: number;
}

declare global {
    interface Window {
        dataLayer: unknown[];
        gtag: {
            (command: 'js', value: Date): void;
            (command: 'config', targetId: string, config?: Record<string, unknown>): void;
            (command: 'event', eventName: string, params?: Record<string, unknown>): void;
            (command: 'consent', mode: 'default' | 'update', params: GtagConsentParams): void;
        };
    }
}

export {};
