"use client";

import React, { useEffect } from 'react';

const FooterAd = () => {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error("AdSense error:", err);
    }
  }, []);

  return (
    <div className="my-4 flex justify-center overflow-x-auto">
        <ins className="adsbygoogle"
            style={{display:"inline-block",width:"728px",height:"90px"}}
            data-ad-client="ca-pub-1425274923062587"
            data-ad-slot="2603795181"></ins>
    </div>
  );
};

export default FooterAd;
