"use client";

import React, { useEffect, useRef } from 'react';

const FooterAd = () => {
  const adPushed = useRef(false);

  useEffect(() => {
    // Only attempt to push the ad if it hasn't been pushed before.
    // This is to prevent errors caused by React's Strict Mode re-renders in development.
    if (adPushed.current) {
      return;
    }

    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      adPushed.current = true; // Mark as pushed to prevent re-execution
    } catch (err) {
      console.error("AdSense error:", err);
    }
  }, []); // Empty dependency array ensures it runs once per component mount.

  return (
    <div className="my-4 w-full text-center" style={{ minHeight: '90px' }}>
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
