import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
//Function stops redirection via the navbar if there are unsaved changes in plan ahead
export default function RedirectPrompt({ when }: { when: boolean }) {
    const router = useRouter();
    const [showRedirectModal, setShowRedirectModal] = useState(false);
    const [nextHref, setNextHref] = useState<string | null>(null);

    useEffect(() => {
        // handles close or tab reload
        const handleWindowClose = (e: BeforeUnloadEvent) => {
            if (!when) return;
            e.preventDefault();
            e.returnValue = '';
        };
        // handles link clicks on navbar
        const handleRouteChange = (e: MouseEvent) => {
            if (!when) return;

            const target = (e.target as HTMLElement).closest('a');

            if (
                !target ||
                !target.href ||
                target.target === '_blank' ||
                target.href.includes('#') ||
                target.origin !== window.location.origin
            ) {
                return;
            }

            const href = target.getAttribute('href');
            if (!href || href === window.location.pathname) return;

            e.preventDefault();
            handleNav(href);
        };
        window.addEventListener('beforeunload', handleWindowClose, true);
        document.addEventListener('click', handleRouteChange, true);

        return () => {
            window.removeEventListener('beforeunload', handleWindowClose, true);
            document.removeEventListener('click', handleRouteChange, true);
        };
    }, [when]);
    // show popup if there are unsaved changes
    const handleNav = (href: string) => {
        if (when) {
            setNextHref(href);
            setShowRedirectModal(true);
        } else {
            router.push(href);
        }
    };
    //action to confirm redirect to another page
    const confirmNav = () => {
        if (nextHref) {
            setShowRedirectModal(false);
            router.push(nextHref);
        }
    };
    //action to stay on plan ahead page
    const cancelNav = () => {
        setNextHref(null);
        setShowRedirectModal(false);
    };
    //action to save changes
    const saveNav = () => {
        setNextHref(null);
        setShowRedirectModal(false);
    };

    return {
        showRedirectModal,
        handleNav,
        confirmNav,
        cancelNav,
        saveNav,
    };
}