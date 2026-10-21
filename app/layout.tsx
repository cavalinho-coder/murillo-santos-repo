import type { Metadata } from 'next';
import './globals.css';
import SiteChrome from '@/components/SiteChrome';
import { site } from '@/lib/site';

const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://drmurillosantos.com.br';
export const metadata: Metadata = {
  metadataBase: new URL(base),
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48', type: 'image/x-icon' },
      { url: '/icons/favicon-96.png', sizes: '96x96', type: 'image/png' },
      { url: '/images/murillo-logo.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  title: {default:'Dr. Murillo Santos | Ginecologista em Maringá',template:'%s | Dr. Murillo Santos'},
  description: site.description,
  keywords:['ginecologista em Maringá','obstetra em Maringá','cirurgia ginecológica Maringá','laparoscopia ginecológica','histeroscopia','endometriose','pré-natal Maringá'],
  alternates:{canonical:'/'},
  openGraph:{type:'website',locale:'pt_BR',siteName:site.name,title:'Dr. Murillo Santos | Ginecologia e Obstetrícia em Maringá',description:site.description,images:[{url:'/images/murillo-hero.webp',width:1200,height:630}]},
  twitter:{card:'summary_large_image',title:'Dr. Murillo Santos',description:site.description,images:['/images/murillo-hero.webp']},
  robots:{index:true,follow:true,googleBot:{index:true,follow:true,'max-image-preview':'large','max-snippet':-1,'max-video-preview':-1}},
};
export default function RootLayout({children}:{children:React.ReactNode}){
  const schema={
    '@context':'https://schema.org','@graph':[
      {'@type':'Person','@id':`${base}/#physician`,name:site.fullName,jobTitle:'Médico Ginecologista e Obstetra',description:site.description,image:`${base}/images/murillo-profile.webp`,sameAs:[site.instagram,site.facebook],identifier:[site.crm,site.rqe1,site.rqe2],alumniOf:[{'@type':'CollegeOrUniversity',name:'Centro Universitário Uningá'},{'@type':'EducationalOrganization',name:'UNESP Botucatu'}]},
      {'@type':['MedicalBusiness','LocalBusiness'],'@id':`${base}/#clinic`,name:`${site.fullName} - ${site.clinic}`,url:base,logo:`${base}/icons/icon-512.png`,telephone:`+55 ${site.phoneDisplay}`,image:`${base}/images/clinica-2.webp`,address:{'@type':'PostalAddress',streetAddress:'Rua Princesa Isabel, 158',addressLocality:'Maringá',addressRegion:'PR',addressCountry:'BR'},medicalSpecialty:['Gynecologic','Obstetric'],employee:{'@id':`${base}/#physician`},sameAs:[site.instagram,site.facebook]},
      {'@type':'WebSite','@id':`${base}/#website`,url:base,name:site.name,inLanguage:'pt-BR',publisher:{'@id':`${base}/#physician`}}
    ]};
  return <html lang="pt-BR"><body><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/><SiteChrome>{children}</SiteChrome></body></html>
}
