"use client";

import React from 'react';

const DisclaimerMarquee: React.FC = () => {
    const disclaimerText = "Disclaimer: This game involves an element of financial risk and may be addictive. Please play responsibly and at your own risk. This platform is intended for users aged 18 and above only. Player's discretion is advised.";

    const marqueeStyle: React.CSSProperties = {
        '--marquee-duration': '40s',
    } as React.CSSProperties;

    return (
        <div className="bg-destructive/10 text-destructive py-2 overflow-hidden w-full font-semibold text-sm">
            <div 
                className="marquee-content-wrapper"
                style={marqueeStyle}
            >
                <span className="px-8">{disclaimerText}</span>
                <span className="px-8">{disclaimerText}</span>
            </div>
        </div>
    );
};

export default DisclaimerMarquee;
