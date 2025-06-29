"use client";

import React, { useEffect } from 'react';

const FooterAd = () => {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err: any) {
      // This error is common in development with React's Strict Mode,
      // as it causes effects to run twice. We can safely ignore it.
      if (!err.message.includes("already have ads in them")) {
        console.error("AdSense error:", err);
      }
    }
  }, []); // Empty dependency array ensures this runs once when the component mounts. The key prop in SiteFooter will remount this component on navigation.

  return (
    <div className="my-4 w-full text-center" style={{ minHeight: '90px' }}>
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
