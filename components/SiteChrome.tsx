'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { site } from '@/lib/site';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ScrollProgress from '@/components/ScrollProgress';

const adsId = 'AW-16906063808';
const consentKey = 'google-ads-measurement-v2';
type Consent = 'granted' | 'denied';
type AdsWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };

function GoogleAdsMeasurement() {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const showDialog = ready && (!consent || editing);

  useEffect(() => {
    if (!showDialog) return;
    const dialog = dialogRef.current;
    dialog?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [showDialog]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(consentKey);
      if (saved === 'granted' || saved === 'denied') setConsent(saved);
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (consent !== 'granted') return;
    const ads = window as AdsWindow;
    if (!ads.gtag) {
      ads.dataLayer ??= [];
      ads.gtag = function () { ads.dataLayer?.push(arguments); };
      ads.gtag('consent', 'default', {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'denied',
        analytics_storage: 'denied',
      });
      ads.gtag('js', new Date());
      ads.gtag('config', adsId, {
        send_page_view: false,
        allow_ad_personalization_signals: false,
        allow_google_signals: false,
      });
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + adsId;
      document.head.appendChild(script);
    }

    function trackClick(event: MouseEvent) {
      if (window.location.pathname.startsWith('/editor-artigos') || !(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>('a[href]');
      if (!link) return;
      const url = new URL(link.href);
      const isClinicWhatsApp =
        (url.hostname === 'wa.me' && url.pathname === '/' + site.phone) ||
        (url.hostname === 'api.whatsapp.com' && url.pathname === '/send' &&
          url.searchParams.get('phone') === site.phone);
      if (!isClinicWhatsApp || url.protocol !== 'https:') return;
      ads.gtag?.('event', 'conversion', {
        send_to: adsId + '/PpACCKfc-ZQbEMCfuP0-',
        transport_type: 'beacon',
        page_location: window.location.origin + '/',
        page_referrer: '',
      });
    }

    document.addEventListener('click', trackClick, true);
    return () => document.removeEventListener('click', trackClick, true);
  }, [consent]);

  function saveConsent(choice: Consent) {
    try { localStorage.setItem(consentKey, choice); } catch {}
    if (consent === 'granted' && choice === 'denied') {
      (window as AdsWindow).gtag?.('consent', 'update', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
      });
      document.cookie = '_gcl_aw=; Max-Age=0; Path=/';
      document.cookie = '_gcl_aw=; Max-Age=0; Path=/; Domain=drmurillosantos.com.br';
      window.location.reload();
    }
    setConsent(choice);
    setEditing(false);
  }

  if (!ready) return null;
  if (consent && !editing) {
    return <div style={{textAlign:'center',padding:'0.75rem'}}>
      <button type="button" onClick={() => setEditing(true)}>Preferências de cookies</button>
    </div>;
  }

  const buttonStyle = {
    flex: '1 1 9rem',
    minHeight: '3rem',
    background: '#fff',
    color: '#222',
    border: '2px solid #444',
    borderRadius: '0.5rem',
    fontWeight: 700,
    cursor: 'pointer',
  } as const;

  return <dialog
    ref={dialogRef}
    aria-labelledby="cookie-preferences-title"
    aria-describedby="cookie-preferences-description"
    onCancel={(event) => event.preventDefault()}
    style={{
      position: 'fixed', inset: 0, margin: 'auto',
      width: 'min(36rem, calc(100% - 2rem))',
      background: '#fff', color: '#222',
      border: '1px solid #ddd', borderRadius: '1rem',
      padding: 'clamp(1.25rem, 5vw, 2.5rem)',
      boxShadow: '0 12px 44px #0005',
    }}
  >
    <style>{'dialog[aria-labelledby="cookie-preferences-title"]::backdrop { background: rgba(0, 0, 0, 0.72); }'}</style>
    <h2 id="cookie-preferences-title" style={{fontSize:'clamp(1.5rem, 4vw, 2rem)', margin:'0 0 1rem'}}>
      Preferências de cookies
    </h2>
    <p id="cookie-preferences-description">
      Com sua autorização, usamos cookies do Google Ads para medir cliques no botão de WhatsApp neste site.
      Escolha uma opção para continuar.
    </p>
    <div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem',marginTop:'1.5rem'}}>
      <button type="button" style={buttonStyle} onClick={() => saveConsent('denied')}>Recusar</button>
      <button type="button" style={buttonStyle} onClick={() => saveConsent('granted')}>Aceitar</button>
    </div>
  </dialog>;
}

export default function SiteChrome({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const isEditor=pathname.startsWith('/editor-artigos');
  if(isEditor) return <>{children}</>;
  return <><ScrollProgress/><Header/><main>{children}</main><Footer/><GoogleAdsMeasurement/></>;
}
