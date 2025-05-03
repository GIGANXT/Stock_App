import React, { useState, useRef, useEffect } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import LiveSpotCard from "./LiveSpotCard";
import LMECashSettlement from "./LMECashSettlement";
import { Calendar, AlertTriangle, BarChart2 } from "lucide-react";
import { format } from "date-fns";
import TodayLSP from "./todayLSP";

interface LMECashSettlementSectionProps {
  title?: string;
}

// CSS for slider styles
const sliderStyles = {
  '.lme-slider': {
    margin: '0 -8px',
    touchAction: 'pan-y',
    userSelect: 'none',
    transition: 'all 0.3s ease',
  },
  '.lme-slider .slick-track': {
    display: 'flex',
    gap: '0',
    alignItems: 'stretch',
    margin: '0',
  },
  '.lme-slider .slick-slide': {
    height: 'auto',
    padding: '0 6px',
    transition: 'all 0.3s ease',
  },
  '.lme-slider .slick-slide > div': {
    height: '100%',
    display: 'flex',
  },
  '.lme-slider.at-start': {
    cursor: 'not-allowed'
  },
  '.lme-slider.at-end': {
    cursor: 'not-allowed'
  },
  '.card-container': {
    height: '100%',
    minHeight: '162px',
    display: 'flex',
  },
  // Edge cards style
  '.slider-edge-indicator': {
    position: 'absolute',
    top: '0',
    bottom: '0',
    width: '20px',
    pointerEvents: 'none',
    zIndex: '10',
    opacity: '0',
    transition: 'opacity 0.3s ease',
  },
  '.slider-edge-indicator.start': {
    left: '0',
    background: 'linear-gradient(to right, rgba(239, 246, 255, 0.8), transparent)',
    opacity: '1',
  },
  '.slider-edge-indicator.end': {
    right: '0',
    background: 'linear-gradient(to left, rgba(239, 246, 255, 0.8), transparent)',
    opacity: '1',
  },
  '.lme-slider.boundary-hit': {
    transform: 'translateX(0)',
    animation: 'shake 0.3s cubic-bezier(.36,.07,.19,.97) both',
  },
  '@keyframes shake': {
    '0%, 100%': { transform: 'translateX(0)' },
    '20%, 60%': { transform: 'translateX(-2px)' },
    '40%, 80%': { transform: 'translateX(2px)' },
  },
};

// Define LMECashSettlement data interface
interface LMECashSettlementData {
  id: number;
  date: string;
  price: number;
  Dollar_Difference: number;
  INR_Difference: number;
  createdAt: string;
  updatedAt: string;
}

export default function LMECashSettlementSection({ title = "LME Cash Settlement" }: LMECashSettlementSectionProps) {
  const sliderRef = useRef<Slider>(null);
  const [sliderState, setSliderState] = useState({
    isAtStart: true,
    isAtEnd: false,
    currentIndex: 0
  });
  const [lmeData, setLmeData] = useState<LMECashSettlementData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Add state for modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch LME Cash Settlement data from the API
  useEffect(() => {
    const fetchLMEData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Add cache-busting query parameter and headers
        const timestamp = new Date().getTime();
        // Updated to use the correct API endpoint (lmecashcal)
        const response = await fetch(`/api/lmecashcal?_t=${timestamp}&limit=10`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch LME data: ${response.status} ${response.statusText}. ${errorText}`);
        }

        const result = await response.json();
        console.log("LME Cash Settlement API Response:", result);
        
        if (result.success && Array.isArray(result.data)) {
          // Sort data by date in descending order (most recent first)
          const sortedData = [...result.data].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          setLmeData(sortedData);
        } else {
          throw new Error('Invalid data format received from API');
        }
      } catch (error) {
        console.error('Error fetching LME data:', error);
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
        // Don't clear existing data on error to maintain the last known good state
      } finally {
        setIsLoading(false);
      }
    };

    fetchLMEData();

    // Set up polling interval (every 5 minutes)
    const intervalId = setInterval(fetchLMEData, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Format date from API data for display (e.g., "2023-04-28" to "28. April 2023")
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return dateString; // Return original string if date is invalid
      }
      
      // Format to match the UI in the image (25. April 2025 style)
      return format(date, "d MMMM yyyy");
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateString; // Return original string if parsing fails
    }
  };

  // Format INR difference to properly display in the component
  const formatINRDifference = (value: number): string => {
    return Math.abs(value).toFixed(2);
  };

  // Apply custom slider styles
  useEffect(() => {
    // Apply custom styles
    Object.entries(sliderStyles).forEach(([selector, styles]) => {
      const styleElement = document.createElement('style');
      styleElement.textContent = `${selector} { ${Object.entries(styles).map(([prop, value]) => `${prop}: ${value};`).join(' ')} }`;
      document.head.appendChild(styleElement);
    });

    return () => {
      // Clean up styles when component unmounts
      const styleElements = document.querySelectorAll('style');
      styleElements.forEach(el => {
        if (el.textContent && Object.keys(sliderStyles).some(selector => el.textContent?.includes(selector))) {
          el.remove();
        }
      });
    };
  }, []);

  // Update slider state after each change
  const handleAfterChange = (currentSlide: number) => {
    const slidesToShow = window.innerWidth >= 768 ? 3 : 1;
    setSliderState({
      isAtStart: currentSlide === 0,
      isAtEnd: currentSlide + slidesToShow >= (lmeData.length || 1),
      currentIndex: currentSlide
    });
  };

  // Expanded mobile view state
  const [expandedMobileView, setExpandedMobileView] = useState(false);

  // Function to render error content
  const renderErrorContent = () => {
    return (
      <div className="price-card bg-white rounded-xl p-3 md:p-4 border border-gray-200 
          shadow-sm hover:shadow-md transition-all duration-200 w-full
          relative overflow-hidden gpu-render group h-[162px]">
        
        {/* Background effect - properly layered */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity 
          bg-red-500 -z-10"></div>

        <div className="relative flex flex-col h-full gap-1 md:gap-2 justify-between">
          {/* Header with indicator badge */}
          <div>
            <div className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium inline-flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 crisp-text" />
              <span>Error Loading Data</span>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 flex flex-col justify-center items-center py-2">
            <AlertTriangle size={24} className="text-red-500 mb-2" />
            <p className="text-sm text-gray-600 text-center">
              {error || 'Failed to load LME Cash Settlement data'}
            </p>
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between mt-auto pt-2 text-xs text-gray-500">
            <div className="font-bold">
              {format(new Date(), 'dd MMMM yyyy')}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Function to render empty content
  const renderEmptyContent = () => {
    return (
      <div className="price-card bg-white rounded-xl p-3 md:p-4 border border-gray-200 
          shadow-sm hover:shadow-md transition-all duration-200 w-full
          relative overflow-hidden gpu-render group h-[162px]">
        
        {/* Background effect - properly layered */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity 
          bg-amber-500 -z-10"></div>

        <div className="relative flex flex-col h-full gap-1 md:gap-2 justify-between">
          {/* Header with indicator badge */}
          <div>
            <div className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full font-medium inline-flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 crisp-text" />
              <span>No Data Available</span>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 flex flex-col justify-center items-center py-2">
            <AlertTriangle size={24} className="text-amber-500 mb-2" />
            <p className="text-sm text-gray-600 text-center">
              No LME Cash Settlement data available
            </p>
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between mt-auto pt-2 text-xs text-gray-500">
            <div className="font-bold">
              {format(new Date(), 'dd MMMM yyyy')}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Update desktop card rendering structure to match mobile
  const renderCard = (data: LMECashSettlementData, key: string) => {
    return (
      <div key={key} className="h-full">
        <LMECashSettlement
          basePrice={data.price}
          spread={data.Dollar_Difference}
          spreadINR={formatINRDifference(data.INR_Difference)}
          isIncrease={data.Dollar_Difference > 0}
          formattedDate={formatDate(data.date)}
        />
      </div>
    );
  };

  return (
    <section className="relative bg-gradient-to-br from-indigo-50/95 via-blue-50/95 to-sky-50/95 backdrop-blur-sm rounded-xl p-4 md:p-6 
      border border-indigo-100/50 shadow-[0_8px_16px_rgba(99,102,241,0.06)] hover:shadow-[0_12px_24px_rgba(99,102,241,0.08)] 
      transition-all duration-300 overflow-hidden">
      
      {/* Decorative background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.05)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(56,189,248,0.05)_0%,transparent_50%)]" />

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base md:text-lg font-bold text-gray-800 flex items-center">
            <BarChart2 className="w-5 h-5 mr-2 text-indigo-600" />
            {title}
          </h2>
          
          {/* Add the Today's LME Cash Settlement button */}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-1.5 px-3 rounded-md transition-colors flex items-center"
          >
            <Calendar className="w-4 h-4 mr-1.5" />
            Today&apos;s LME Cash Settlement
          </button>
        </div>

        {/* Desktop View - Slider */}
        <div className="relative hidden md:flex items-stretch gap-4">
          {/* Fixed LiveSpotCard (First Card) */}
          <div className="flex-shrink-0" style={{ width: '30%' }}>
            <div className="transform hover:scale-105 transition-transform duration-300 hover:shadow-lg">
              <LiveSpotCard 
                apiUrl="/api/metal-price?returnAverage=true"
                unit="/MT" 
              />
            </div>
          </div>

          {/* Slider with LME Settlement Cards */}
          <div className="flex-grow relative" style={{ width: '68%' }}>
            {/* Edge indicators */}
            <div className={`slider-edge-indicator start ${sliderState.isAtStart ? 'opacity-0' : ''}`} />
            <div className={`slider-edge-indicator end ${sliderState.isAtEnd ? 'opacity-0' : ''}`} />

            <Slider
              ref={sliderRef}
              dots={false}
              infinite={false}
              speed={700}
              slidesToShow={3}
              slidesToScroll={1}
              autoplay={false}
              cssEase="cubic-bezier(0.25, 1, 0.5, 1)"
              adaptiveHeight={false}
              variableWidth={false}
              swipeToSlide={true}
              draggable={true}
              arrows={false}
              accessibility={true}
              touchThreshold={5}
              swipe={true}
              touchMove={true}
              useCSS={true}
              useTransform={true}
              edgeFriction={0.6}
              afterChange={handleAfterChange}
              className={`lme-slider ${sliderState.isAtStart ? 'at-start' : ''} ${sliderState.isAtEnd ? 'at-end' : ''}`}
              responsive={[
                {
                  breakpoint: 1024,
                  settings: {
                    slidesToShow: 2,
                    slidesToScroll: 1,
                    touchThreshold: 8
                  }
                },
                {
                  breakpoint: 768,
                  settings: {
                    slidesToShow: 1,
                    slidesToScroll: 1,
                    touchThreshold: 10
                  }
                }
              ]}
            >
              {isLoading ? (
                // Loading skeletons for desktop view
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={`skeleton-${index}`} className="h-full py-0.5 px-2">
                    <div className="price-card bg-white rounded-xl p-3 md:p-4 border border-gray-200 
                        shadow-sm hover:shadow-md transition-all duration-200 w-full
                        relative overflow-hidden gpu-render h-[162px]">
                      <div className="flex flex-col h-full gap-1 md:gap-2 justify-between">
                        {/* Header with indicator badge */}
                        <div>
                          <div className="h-5 w-32 bg-gray-200 animate-pulse rounded-full mb-2"></div>
                        </div>
                        
                        {/* Price Content */}
                        <div className="flex-1 py-1 md:py-2">
                          <div className="h-6 w-28 md:w-32 bg-gray-200 animate-pulse mb-3 rounded"></div>
                          <div className="h-4 w-24 bg-gray-200 animate-pulse mb-2 rounded"></div>
                          <div className="h-4 w-20 bg-gray-200 animate-pulse rounded"></div>
                        </div>
                        
                        {/* Footer */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="h-3 w-24 bg-gray-200 animate-pulse rounded"></div>
                          <div className="h-3 w-16 bg-gray-200 animate-pulse rounded"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : error ? (
                // Error state
                <div className="col-span-3 py-0.5 px-2">
                  {renderErrorContent()}
                </div>
              ) : lmeData.length === 0 ? (
                // Empty state
                <div className="col-span-3 py-0.5 px-2">
                  {renderEmptyContent()}
                </div>
              ) : (
                // Real data cards - use the shared rendering function
                lmeData.map((data, index) => (
                  <div key={`settlement-card-${index}`} className="h-full py-0.5 px-2">
                    {renderCard(data, `desktop-card-${index}`)}
                  </div>
                ))
              )}
            </Slider>
          </div>
        </div>

        {/* Mobile View - Stacked Cards */}
        <div className="md:hidden">
          <div className="space-y-2.5">
            {/* Today's Card */}
            <div className="bg-white/50 p-2 rounded-xl shadow-sm">
              <LiveSpotCard 
                apiUrl="/api/metal-price?returnAverage=true"
                unit="/MT" 
              />
            </div>

            {/* Show only first 3 historical cards or all when expanded */}
            <div className="grid grid-cols-1 gap-2.5 scroll-mt-4 scroll-smooth" id="mobile-cards-container">
              {isLoading ? (
                // Loading skeletons for mobile view
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={`mobile-skeleton-${index}`} 
                      className="price-card bg-white rounded-xl p-3 md:p-4 border border-gray-200 
                      shadow-sm hover:shadow-md transition-all duration-200 w-full
                      relative overflow-hidden gpu-render h-[162px]">
                    <div className="flex flex-col h-full gap-1 md:gap-2 justify-between">
                      {/* Header with indicator badge */}
                      <div>
                        <div className="h-5 w-32 bg-gray-200 animate-pulse rounded-full mb-2"></div>
                      </div>
                      
                      {/* Price Content */}
                      <div className="flex-1 py-1 md:py-2">
                        <div className="h-6 w-28 md:w-32 bg-gray-200 animate-pulse mb-3 rounded"></div>
                        <div className="h-4 w-24 bg-gray-200 animate-pulse mb-2 rounded"></div>
                        <div className="h-4 w-20 bg-gray-200 animate-pulse rounded"></div>
                      </div>
                      
                      {/* Footer */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="h-3 w-24 bg-gray-200 animate-pulse rounded"></div>
                        <div className="h-3 w-16 bg-gray-200 animate-pulse rounded"></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : error ? (
                // Error state
                renderErrorContent()
              ) : lmeData.length === 0 ? (
                // Empty state
                renderEmptyContent()
              ) : (
                // Real data cards - also use the shared rendering function
                lmeData
                  .slice(0, expandedMobileView ? lmeData.length : 3)
                  .map((data, index) => (
                    <div
                      key={`mobile-card-${index}`}
                      id={`mobile-card-${index}`}
                    >
                      {renderCard(data, `mobile-card-content-${index}`)}
                    </div>
                  ))
              )}
            </div>

            {/* Show More / Show Less Button - only if we have more than 3 entries and not loading */}
            {!isLoading && !error && lmeData.length > 3 && (
              <button
                onClick={() => setExpandedMobileView(!expandedMobileView)}
                className="w-full mt-1.5 py-2.5 px-4 text-sm font-medium text-indigo-700 bg-indigo-50 
                  hover:bg-indigo-100 rounded-md border border-indigo-200 transition-all duration-200
                  flex items-center justify-center gap-2"
              >
                <span>{expandedMobileView ? 'Show Less' : 'Show More'}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform duration-300 ${expandedMobileView ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Navigation and attribution section */}
        <div className="flex justify-between items-center mt-2 md:mt-3">
          <p className="text-sm text-gray-500">Source: Westmetals</p>

          {/* Desktop Navigation buttons */}
          <div className="hidden md:flex space-x-2">
            <button
              onClick={() => {
                if (sliderRef.current) {
                  sliderRef.current.slickPrev();
                }
              }}
              disabled={sliderState.isAtStart || isLoading || error !== null || lmeData.length === 0}
              className={`w-9 h-9 flex items-center justify-center rounded-md
                ${sliderState.isAtStart || isLoading || error !== null || lmeData.length === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 active:from-indigo-800 active:to-blue-800'} 
                transition-all duration-200 shadow-md`}
              aria-label="Previous card"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <button
              onClick={() => {
                if (sliderRef.current) {
                  sliderRef.current.slickNext();
                }
              }}
              disabled={sliderState.isAtEnd || isLoading || error !== null || lmeData.length === 0}
              className={`w-9 h-9 flex items-center justify-center rounded-md
                ${sliderState.isAtEnd || isLoading || error !== null || lmeData.length === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 active:from-indigo-800 active:to-blue-800'} 
                transition-all duration-200 shadow-md`}
              aria-label="Next card"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Add the modal component */}
      <TodayLSP 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </section>
  );
} 