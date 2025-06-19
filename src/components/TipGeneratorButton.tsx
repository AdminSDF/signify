"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb } from 'lucide-react';

interface TipGeneratorButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

const TipGeneratorButton: React.FC<TipGeneratorButtonProps> = ({ onClick, disabled }) => {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className="mt-4 flex items-center gap-2 mx-auto"
      aria-label="Get an AI-powered tip"
    >
      <Lightbulb className="w-5 h-5" />
      Get a Pro Tip!
    </Button>
  );
};

export default TipGeneratorButton;
