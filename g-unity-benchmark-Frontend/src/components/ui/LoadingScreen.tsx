import React, { useState, useEffect } from 'react';
import logoSolo from '../../assets/images/logo-solo.png';

interface LoadingScreenProps {
  isVisible: boolean;
}

export function LoadingScreen({ isVisible }: LoadingScreenProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setShowContent(true), 200);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isVisible]);

  return (
    <div className={`fixed inset-0 flex items-center justify-center bg-black z-50 transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {/* Subtle grid background like Unity */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(125, 211, 252, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(125, 211, 252, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-gray-900/50 via-transparent to-transparent" />

      <div className={`relative flex items-center justify-center transition-all duration-700 ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        {/* Línea giratoria lenta en gray-800 */}
        <div className="absolute w-24 h-24">
          <div
            className="w-full h-full border-2 border-transparent border-t-gray-700 rounded-full"
            style={{ animation: 'spin 2s linear infinite' }}
          ></div>
        </div>
        {/* Logo en el centro, tamaño ajustado */}
        <div className="relative z-10 relative flex h-11 w-10 flex-none items-center justify-center">
          <img src={logoSolo} alt="Logo Solo" className="w-full h-full drop-shadow-2xl" />
        </div>
        {/* Efecto de glow sutil */}
        <div className="absolute w-16 h-16 bg-blue-400/20 rounded-full blur-2xl"></div>
      </div>
    </div>
  );
}