"use client";

import React, { useEffect, useRef } from 'react';

const FooterAd = () => {
  const adInsRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    const adContainer = adInsRef.current;
    
    // We check if the ad container (<ins> tag) is there and if it's empty.
    // AdSense will fill the container, so if it's not empty, we don't push again.
    // This is more robust against React 18's Strict Mode re-renders.
    if (adContainer && adContainer.innerHTML.trim() === "") {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        // The error is often "TagError: adsbygoogle.push() error: All ins elements in the DOM with class=adsbygoogle already have ads in them."
        // We can safely ignore it in many cases, but it's better to prevent the call.
        console.error("AdSense error:", err);
      }
    }
  }, []); // Empty dependency array ensures it runs once after mount.

  return (
    <div className="my-4 w-full text-center" style={{ minHeight: '90px' }}>
        <ins 
             ref={adInsRef}
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
