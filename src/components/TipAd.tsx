
"use client";

import React, { useEffect } from 'react';

const TipAd = () => {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err: any) {
      if (!err.message.includes("already have ads in them")) {
        console.error("AdSense error in TipAd:", err);
      }
    }
  }, []);

  return (
    <div className="my-4 w-full text-center" style={{ minHeight: '100px' }}>
        {/* Spinify Tips Ad */}
        <ins 
             className="adsbygoogle"
             style={{display:"block", width: "100%"}}
             data-ad-client={process.env.NEXT_PUBLIC_ADMOB_PUBLISHER_ID}
             data-ad-slot={process.env.NEXT_PUBLIC_ADMOB_TIPS_AD_UNIT_ID}
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
    </div>
  );
};

export default TipAd;
