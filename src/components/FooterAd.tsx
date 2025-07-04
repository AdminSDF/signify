"use client";

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const FooterAd = () => {
  const pathname = usePathname();

  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error("AdSense error:", err);
    }
  }, [pathname]);

  return (
    <div key={pathname} className="my-4 w-full text-center" style={{ minHeight: '90px' }}>
        {/* Spinify 1 ad */}
        <ins 
             className="adsbygoogle"
             style={{display:"block"}}
             data-ad-client="ca-pub-1425274923062587"
             data-ad-slot="9499288281"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
    </div>
  );
};

export default FooterAd;
