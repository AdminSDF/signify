"use client";

import React, { useEffect, useRef } from 'react';

const FooterAd = () => {
  const adContainerRef = useRef<HTMLDivElement>(null);
  const adPushed = useRef(false);

  useEffect(() => {
    if (adPushed.current || !adContainerRef.current) {
      return;
    }

    // Check if an ad has already been loaded in this container by AdSense
    if (adContainerRef.current.querySelector('.adsbygoogle-processing') || adContainerRef.current.innerHTML.trim() !== '') {
        // If an ad is already there or being processed, don't push another one.
        return;
    }

    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      adPushed.current = true;
    } catch (err) {
      console.error("AdSense error:", err);
    }
  }, []);

  return (
    <div ref={adContainerRef} className="my-4 w-full text-center" style={{ minHeight: '90px' }}>
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
