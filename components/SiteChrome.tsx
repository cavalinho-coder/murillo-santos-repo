'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ScrollProgress from '@/components/ScrollProgress';

const adsId = 'AW-16906063808';
const consentKey = 'google-ads-measurement';
type Consent = 'granted' | 'denied';
type AdsWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };

function GoogleAdsMeasurement() {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);

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
      if (window.location.pathname !== '/' || !(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>('a[href]');
      if (!link) return;
      const url = new URL(link.href);
      const isClinicWhatsApp =
        (url.hostname === 'wa.me' && url.pathname === '/5544991291105') ||
        (url.hostname === 'api.whatsapp.com' && url.pathname === '/send' &&
          url.searchParams.get('phone') === '5544991291105');
      if (!isClinicWhatsApp || url.protocol !== 'https:') return;
      ads.gtag?.('event', 'conversion', {
        send_to: adsId + '/PpACCKfc-ZQbEMCfuP0-',
        transport_type: 'beacon',
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

  return <section aria-label="Preferências de cookies" style={{
    position:'fixed', bottom:'1rem', left:'1rem', zIndex:1000,
    width:'min(24rem, calc(100% - 2rem))', background:'#fff', color:'#222',
    border:'1px solid #ddd', borderRadius:'0.75rem', padding:'1rem',
    boxShadow:'0 4px 20px #0002',
  }}>
    <p>Com sua autorização, usamos cookies do Google Ads para medir cliques no botão de WhatsApp desta página.</p>
    <div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem',marginTop:'0.75rem'}}>
      <button type="button" onClick={() => saveConsent('denied')}>Recusar</button>
      <button type="button" onClick={() => saveConsent('granted')}>Aceitar</button>
    </div>
  </section>;
}

export default function SiteChrome({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const isEditor=pathname.startsWith('/editor-artigos');
  if(isEditor) return <>{children}</>;
  return <><ScrollProgress/><Header/><main>{children}</main><Footer/>{pathname === '/' && <GoogleAdsMeasurement/>}</>;
}
