'use client';

import { useState } from 'react';
import Link from 'next/link';
import LandingPage from './LandingPage';
import MainPage from './MainPage';
import BlobBackground from './ui/BlobBackground';

type PageType = 'landing' | 'main';

export default function AppFlow() {
  const [currentPage, setCurrentPage] = useState<PageType>('landing');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [blobAnimating, setBlobAnimating] = useState(false);
  const [showBlobBackground] = useState(true);

  const handleNext = () => {
    setIsTransitioning(true);
    setCurrentPage('main');
    // MainPage가 마운트된 후 fade-in 애니메이션 시작
    setTimeout(() => {
      setIsTransitioning(false);
    }, 50);
  };

  const handleBlobAnimationStart = () => {
    setBlobAnimating(true);
  };

  const handleBlobAnimationComplete = () => {
    // blob 애니메이션이 완료되면 페이지 전환
    handleNext();
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'landing':
        return (
          <LandingPage 
            onStart={handleBlobAnimationStart} 
            showBlob={false} 
          />
        );
      case 'main':
        return (
          <div 
            className="transition-opacity duration-500"
            style={{ 
              opacity: isTransitioning ? 0 : 1,
              animation: isTransitioning ? 'none' : 'fadeIn 0.6s ease-in-out'
            }}
          >
            <MainPage showBlob={false} />
          </div>
        );
      default:
        return (
          <LandingPage 
            onStart={handleBlobAnimationStart} 
            showBlob={false} 
          />
        );
    }
  };

  return (
    <div className="min-h-screen relative" style={{ background: 'transparent' }}>
      {/* Lab Navigation Buttons - Global for Root Path */}
      <div className="fixed top-4 right-4 z-[100] flex gap-2">
        <Link href="/lab/v1" className="w-8 h-8 flex items-center justify-center bg-white/50 hover:bg-white/80 backdrop-blur-md rounded-full text-gray-800 font-bold shadow-sm border border-white transition-all">1</Link>
        <Link href="/lab/v2" className="w-8 h-8 flex items-center justify-center bg-white/50 hover:bg-white/80 backdrop-blur-md rounded-full text-gray-800 font-bold shadow-sm border border-white transition-all">2</Link>
        <Link href="/lab/v3" className="w-8 h-8 flex items-center justify-center bg-white/50 hover:bg-white/80 backdrop-blur-md rounded-full text-gray-800 font-bold shadow-sm border border-white transition-all">3</Link>
      </div>

      {/* AppFlow 레벨에서 BlobBackground를 관리하여 상태 유지 */}
      {showBlobBackground && (
        <BlobBackground
          isAnimating={blobAnimating}
          onAnimationComplete={handleBlobAnimationComplete}
        />
      )}
      {renderCurrentPage()}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

