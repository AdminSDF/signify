
"use client";

import React, { useEffect, useRef } from 'react';

const FooterAd = () => {
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    const adContainer = adRef.current;
    if (adContainer && adContainer.getAttribute('data-ad-status') !== 'filled') {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        adContainer.setAttribute('data-ad-status', 'filled');
      } catch (err) {
        console.error("AdSense error:", err);
      }
    }
  }, []);

  return (
    <div className="my-4 w-full text-center" style={{ minHeight: '90px' }}>
        <ins 
             ref={adRef}
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
