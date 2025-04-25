import React, { useState, useEffect, useCallback, useRef } from "react";
import LMECashSettlement from "./LMECashSettlement";
import PriceAlert from "./PriceAlert";
import MCXAluminium from "./MCXAluminium";
import LMEAluminium from "./LMEAluminium";
import MonthPrice from "./MonthPrice";
import RatesDisplay from "./RatesDisplay";
import DelayedSpotCard from "./DelayedSpotCard";
import FeedbackBanner from "./FeedbackBanner";
import { X, Clock, Calendar, DollarSign } from "lucide-react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// Add 'wheel' to ElementEventMap through declaration merging
declare global {
  interface ElementEventMap {
    wheel: WheelEvent;
  }
}

// Define a type for the innerSlider state
interface InnerSliderState {
  animating: boolean;
  autoplaying: boolean;
  currentDirection: number;
  currentLeft: number;
  currentSlide: number;
  direction: number;
  dragging: boolean;
  edgeDragged: boolean;
  initialized: boolean;
  lazyLoadedList: number[];
  listHeight: number;
  listWidth: number;
  scrolling: boolean;
  slideCount: number;
  slideHeight: number;
  slideWidth: number;
  swipeLeft: number;
  swiped: boolean;
  swiping: boolean;
  touchObject: { startX: number; startY: number; curX: number; curY: number };
  trackStyle: object;
  trackWidth: number;
}

// Define a type for the innerSlider
interface ExtendedInnerSlider {
  state: InnerSliderState;
  props: Record<string, unknown>;
  // Add any other properties/methods that you're using
}

// Interface for the returned cleanup object
interface GestureCleanup {
  element: Element;
  handler: (this: Element, e: WheelEvent) => void;
}

// Custom CSS for the slider
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

// Static data for LME Cash Settlement cards
const lmeHistoricalData = [
  {
    basePrice: 2384.00,
    spread: 28.50,
    spreadINR: "3228.52",
    isIncrease: true,
    formattedDate: "23. April 2025"
  },
  {
    basePrice: 2355.50,
    spread: 28.00,
    spreadINR: "1288.88",
    isIncrease: false,
    formattedDate: "22. April 2025"
  },
  {
    basePrice: 2327.50,
    spread: 5.00,
    spreadINR: "605.35",
    isIncrease: false,
    formattedDate: "17. April 2025"
  },
  {
    basePrice: 2332.50,
    spread: 37.5,
    spreadINR: "436975",
    isIncrease: true,
    formattedDate: "16. April 2025"
  },
  {
    basePrice: 2333.50,
    spread: 41.5,
    spreadINR: "439325",
    isIncrease: true,
    formattedDate: "15. April 2025"
  },
  {
    basePrice: 2355.50,
    spread: 43.5,
    spreadINR: "440150",
    isIncrease: true,
    formattedDate: "14. April 2025"
  },
  {
    basePrice: 2364.00,
    spread: 41.0,
    spreadINR: "442225",
    isIncrease: true,
    formattedDate: "11. April 2025"
  },
  {
    basePrice: 2343.50,
    spread: 44.5,
    spreadINR: "446325",
    isIncrease: true,
    formattedDate: "10. April 2025"
  },
  {
    basePrice: 2285.00,
    spread: 42.0,
    spreadINR: "449500",
    isIncrease: true,
    formattedDate: "09. April 2025"
  },
  {
    basePrice: 2366.00,
    spread: 39.0,
    spreadINR: "452525",
    isIncrease: true,
    formattedDate: "08. April 2025"
  }
];

// Today's LME data for the popup
const todaysLMEData = {
  price: 2414.00,
  change: -1.39,
  date: "24. April 2025",
  time: "22:38:04",
  isDelayed: true,
  delayMinutes: 30
};

// Define the interface for slider state
interface SliderState {
  isAtStart: boolean;
  isAtEnd: boolean;
  currentIndex: number;
}

export default function MarketDashboard() {
  const currentDate = new Date();
  const [showLMEPopup, setShowLMEPopup] = useState(false);
  const sliderRef = useRef<Slider>(null);
  const gestureCleanup = useRef<GestureCleanup | null>(null);
  const [expandedMobileView, setExpandedMobileView] = useState(false);
  const [sliderState, setSliderState] = useState<SliderState>({
    isAtStart: true,
    isAtEnd: false,
    currentIndex: 0
  });
  
  // Track and update the current slider state for UI enhancements
  const updateSliderState = useCallback(() => {
    // Safely access the slider state
    if (!sliderRef.current?.innerSlider) return;
    
    const innerSlider = sliderRef.current.innerSlider as ExtendedInnerSlider;
    const { currentSlide, slideCount } = innerSlider.state;
    const slidesToShow = sliderRef.current.props.slidesToShow || 3;
    
    // Determine if we're at the start or end
    const isAtStart = currentSlide === 0;
    const isAtEnd = currentSlide >= slideCount - slidesToShow;
    
    // Update our tracking state
    setSliderState({
      isAtStart,
      isAtEnd,
      currentIndex: currentSlide
    });
    
    // Apply or remove class to the slider element as needed
    const sliderElement = document.querySelector('.lme-slider');
    if (sliderElement) {
      sliderElement.classList.toggle('at-start', isAtStart);
      sliderElement.classList.toggle('at-end', isAtEnd);
    }
  }, []);
  
  // Update slider state when window is resized
  useEffect(() => {
    const handleResize = () => {
      // Update after a short delay to ensure all measurements are correct
      setTimeout(updateSliderState, 200);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Initial update with slight delay to ensure slider is fully rendered
    const initialTimer = setTimeout(updateSliderState, 300);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(initialTimer);
    };
  }, [updateSliderState]);

  // After slider initialization and after every change
  const handleAfterChange = () => {
    updateSliderState();
  };

  // Initial setup - check bounds after component is mounted
  useEffect(() => {
    const timer = setTimeout(updateSliderState, 300);
    return () => clearTimeout(timer);
  }, [updateSliderState]);

  // Block direct DOM manipulation at edges
  useEffect(() => {
    const blockEdgeSliding = () => {
      const sliderElement = document.querySelector('.lme-slider');
      if (!sliderElement) return;
      
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const slider = mutation.target as HTMLElement;
            const isAtStart = slider.classList.contains('at-start');
            const isAtEnd = slider.classList.contains('at-end');
            
            if (isAtStart) {
              // Block further backward sliding
              const track = slider.querySelector('.slick-track') as HTMLElement;
              if (track) track.style.pointerEvents = 'none';
              setTimeout(() => {
                if (track) track.style.pointerEvents = '';
              }, 100);
            }
            
            if (isAtEnd) {
              // Block further forward sliding
              const track = slider.querySelector('.slick-track') as HTMLElement;
              if (track) track.style.pointerEvents = 'none';
              setTimeout(() => {
                if (track) track.style.pointerEvents = '';
              }, 100);
            }
          }
        }
      });
      
      observer.observe(sliderElement, { attributes: true });
      return observer;
    };
    
    const observer = blockEdgeSliding();
    return () => observer?.disconnect();
  }, [updateSliderState]);

  // Handle wheel (trackpad gesture) scrolling with strict bounds checking
  const setupTrackpadGestures = useCallback(() => {
    const sliderElement = document.querySelector('.lme-slider');
    if (!sliderElement) return null;
    
    // Handler function that we can reference for removal
    const wheelHandler = function(this: Element, e: WheelEvent) {
      // Only handle horizontal scrolls or small vertical scrolls that might be intended as horizontal
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.5) {
        e.preventDefault();
        
        // Safely access slider state if available
        if (sliderRef.current?.innerSlider) {
          const innerSlider = sliderRef.current.innerSlider as ExtendedInnerSlider;
          const { currentSlide, slideCount } = innerSlider.state;
          const slidesToShow = sliderRef.current.props.slidesToShow || 3;
          
          // Get current slider state
          const isAtStart = currentSlide === 0;
          const isAtEnd = currentSlide >= slideCount - slidesToShow;
          
          // Only handle horizontal scrolling
          if (e.deltaX > 0) {
            // Only go next if not at the end
            if (!isAtEnd) {
              sliderRef.current.slickNext();
            }
          } else if (e.deltaX < 0) {
            // Only go prev if not at the beginning
            if (!isAtStart) {
              sliderRef.current.slickPrev();
            }
          }
          
          // Update state after potential change
          setTimeout(updateSliderState, 50);
        }
      }
      // Don't prevent default for vertical scrolls - let them pass through
    };
    
    // Track wheel events for horizontal scrolling - now with proper typing
    sliderElement.addEventListener('wheel', wheelHandler, { passive: false });
    
    // Store the handler and element for cleanup
    return { 
      element: sliderElement, 
      handler: wheelHandler
    };
  }, [updateSliderState]);

  // Handle ESC key to close popup - using useCallback for better performance
  const closePopup = useCallback(() => {
    setShowLMEPopup(false);
  }, []);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePopup();
      }
    };
    
    if (showLMEPopup) {
      window.addEventListener('keydown', handleEsc);
      // Prevent scrolling when popup is open
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [showLMEPopup, closePopup]);

  // Handle keyboard navigation with direct event prevention
  useEffect(() => {
    // Direct event prevention for keyboard
    const preventKeyboardWrap = (e: KeyboardEvent) => {
      // Only handle left/right arrow keys, let up/down pass through
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      
      // Check boundaries
      if (!sliderRef.current?.innerSlider) return;
      
      const innerSlider = sliderRef.current.innerSlider as ExtendedInnerSlider;
      const { currentSlide, slideCount } = innerSlider.state;
      const slidesToShow = sliderRef.current.props.slidesToShow || 3;
      
      // Prevent default action for keys that would cause wrapping
      if ((e.key === 'ArrowLeft' && currentSlide === 0) || 
          (e.key === 'ArrowRight' && currentSlide >= slideCount - slidesToShow)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    
    // Add event listener directly to window
    window.addEventListener('keydown', preventKeyboardWrap, true);
    
    // Standard keyboard navigation but with strict boundaries
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle left/right arrow keys, let up/down pass through
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      
      if (sliderRef.current?.innerSlider) {
        const innerSlider = sliderRef.current.innerSlider as ExtendedInnerSlider;
        const { currentSlide, slideCount } = innerSlider.state;
        const slidesToShow = sliderRef.current.props.slidesToShow || 3;
        
        const isAtStart = currentSlide === 0;
        const isAtEnd = currentSlide >= slideCount - slidesToShow;
        
        if (e.key === 'ArrowLeft') {
          if (!isAtStart) {
            sliderRef.current.slickPrev();
            setTimeout(updateSliderState, 50);
          } else {
            // Add visual feedback for hitting the boundary
            const sliderElement = document.querySelector('.lme-slider');
            if (sliderElement) {
              sliderElement.classList.add('boundary-hit');
              setTimeout(() => {
                sliderElement.classList.remove('boundary-hit');
              }, 300);
            }
          }
        } else if (e.key === 'ArrowRight') {
          if (!isAtEnd) {
            sliderRef.current.slickNext();
            setTimeout(updateSliderState, 50);
          } else {
            // Add visual feedback for hitting the boundary
            const sliderElement = document.querySelector('.lme-slider');
            if (sliderElement) {
              sliderElement.classList.add('boundary-hit');
              setTimeout(() => {
                sliderElement.classList.remove('boundary-hit');
              }, 300);
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', preventKeyboardWrap, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [updateSliderState]);

  // Apply custom slider styles
  useEffect(() => {
    // Apply custom styles
    Object.entries(sliderStyles).forEach(([selector, styles]) => {
      const styleElement = document.createElement('style');
      styleElement.textContent = `${selector} { ${Object.entries(styles).map(([prop, value]) => `${prop}: ${value};`).join(' ')} }`;
      document.head.appendChild(styleElement);
    });
    
    // Call after a short delay to ensure the slider is fully initialized
    setTimeout(() => {
      // Set up the trackpad gestures directly here instead of using extra gesture cleanup
      const sliderElement = document.querySelector('.lme-slider');
      if (sliderElement) {
        const wheelHandler = function(this: Element, e: WheelEvent) {
          // Only handle horizontal scrolls or small vertical scrolls that might be intended as horizontal
          if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.5) {
            e.preventDefault();
            
            // Safely access slider state if available
            if (sliderRef.current?.innerSlider) {
              const innerSlider = sliderRef.current.innerSlider as ExtendedInnerSlider;
              const { currentSlide, slideCount } = innerSlider.state;
              const slidesToShow = sliderRef.current.props.slidesToShow || 3;
              
              // Get current slider state
              const isAtStart = currentSlide === 0;
              const isAtEnd = currentSlide >= slideCount - slidesToShow;
              
              // Only handle horizontal scrolling
              if (e.deltaX > 0) {
                // Only go next if not at the end
                if (!isAtEnd) {
                  sliderRef.current.slickNext();
                }
              } else if (e.deltaX < 0) {
                // Only go prev if not at the beginning
                if (!isAtStart) {
                  sliderRef.current.slickPrev();
                }
              }
              
              // Update state after potential change
              setTimeout(updateSliderState, 50);
            }
          }
          // Don't prevent default for vertical scrolls - let them pass through
        };
        
        // Track wheel events for horizontal scrolling - now with proper typing
        sliderElement.addEventListener('wheel', wheelHandler, { passive: false });
        
        // Store the handler and element for cleanup
        gestureCleanup.current = { 
          element: sliderElement, 
          handler: wheelHandler
        };
      }
    }, 500);

    return () => {
      // Clean up styles when component unmounts
      const styleElements = document.querySelectorAll('style');
      styleElements.forEach(el => {
        if (el.textContent && Object.keys(sliderStyles).some(selector => el.textContent?.includes(selector))) {
          el.remove();
        }
      });
      
      // Remove event listeners properly
      if (gestureCleanup.current) {
        const { element, handler } = gestureCleanup.current;
        element.removeEventListener('wheel', handler);
      }
    };
  }, [updateSliderState, setupTrackpadGestures]);

  // Enhanced scroll to specific card with better visual feedback
  const scrollToCard = (index: number) => {
    const element = document.getElementById(`mobile-card-${index}`);
    if (element) {
      // Add highlight class to the card being scrolled to
      element.classList.add('ring-2', 'ring-indigo-400', 'scale-[1.02]');
      
      // Scroll with animation
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
      });
      
      // Remove highlight after animation completes
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-indigo-400', 'scale-[1.02]');
      }, 1000);
    }
  };

  // Function to determine if we're on mobile view
  const isMobileView = () => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  };

  return (
    <div className="max-w-[1366px] mx-auto px-4 pt-4 space-y-2 min-h-screen">
      <FeedbackBanner />
      
      {/* LME Cash Settlement Block */}
      <section className="relative bg-gradient-to-br from-indigo-50/95 via-blue-50/95 to-sky-50/95 backdrop-blur-sm rounded-xl p-4 md:p-6 
        border border-indigo-100/50 shadow-[0_8px_16px_rgba(99,102,241,0.06)] hover:shadow-[0_12px_24px_rgba(99,102,241,0.08)] 
        transition-all duration-300 overflow-hidden">
        
        {/* Decorative background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.05)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(56,189,248,0.05)_0%,transparent_50%)]" />

        <div className="relative">
          <div className="flex flex-col md:flex-row justify-between md:items-baseline mb-3 md:mb-4 gap-3">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
              LME Cash Settlement
            </h2>
            <button 
              onClick={() => setShowLMEPopup(true)}
              className="px-5 py-2.5 text-sm font-semibold text-white 
                bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700
                hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800
                rounded-md shadow-lg hover:shadow-xl transition-all duration-200
                border border-blue-700/20 hover:translate-y-[-2px] active:translate-y-0
                animate-pulse-subtle flex items-center gap-2 self-start md:self-auto"
              aria-label="View today's LME Cash Settlement"
              style={{
                animation: "pulse-light 2s infinite",
                animationDelay: "1s"
              }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full relative">
                  <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75"></div>
                </div>
                <span className="whitespace-nowrap">Today&apos;s LME Cash Settlement</span>
              </div>
            </button>
          </div>

          {/* Desktop View - Slider */}
          <div className="relative hidden md:flex items-stretch gap-4">
            {/* Fixed DelayedSpotCard (First Card) */}
            <div className="flex-shrink-0" style={{ width: '23%' }}>
              <DelayedSpotCard 
                lastUpdated={currentDate} 
                spotPrice={todaysLMEData.price}
                changePercent={todaysLMEData.change}
              />
            </div>
            
            {/* Slider with modern sliding effects and matched heights */}
            <div className="flex-grow relative" style={{ width: '75%' }}>
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
                draggable={false}
                arrows={false}
                accessibility={true}
                touchThreshold={5}
                swipe={true}
                touchMove={true}
                useCSS={true}
                useTransform={true}
                edgeFriction={0.6}
                beforeChange={(oldIndex: number, newIndex: number) => {
                  // Ensure we don't go beyond bounds
                  if (sliderRef.current?.innerSlider) {
                    const innerSlider = sliderRef.current.innerSlider as ExtendedInnerSlider;
                    const { slideCount } = innerSlider.state;
                    const slidesToShow = sliderRef.current.props.slidesToShow || 3;
                    
                    if (newIndex < 0 || newIndex > slideCount - slidesToShow) {
                      return false;
                    }
                  }
                }}
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
                  },
                  {
                    breakpoint: 640,
                    settings: {
                      slidesToShow: 1,
                      slidesToScroll: 1,
                      touchThreshold: 15
                    }
                  }
                ]}
              >
                {/* Historical Cards with static data */}
                {lmeHistoricalData.map((data, index) => (
                  <div key={`static-${index + 1}`} className="h-full py-0.5 px-2">
                    <div className="h-full">
                      <LMECashSettlement 
                        basePrice={data.basePrice}
                        spread={data.spread}
                        spreadINR={data.spreadINR}
                        isIncrease={data.isIncrease}
                        formattedDate={data.formattedDate}
                      />
                    </div>
                  </div>
                ))}
              </Slider>
            </div>
          </div>

          {/* Mobile View - Stacked Cards with Show More button */}
          <div className="md:hidden">
            <div className="space-y-2.5">
              {/* Today's Card */}
              <DelayedSpotCard 
                lastUpdated={currentDate} 
                spotPrice={todaysLMEData.price}
                changePercent={todaysLMEData.change}
              />
              
              {/* Mobile slider navigation controls - removed as they've been moved to bottom */}
              <div className="mt-4 flex justify-end">
                <div className="flex space-x-1.5">
                  {/* Original buttons removed since they've been moved to the bottom */}
                </div>
              </div>
              
              {/* Show only first 3 historical cards or all when expanded */}
              <div className="grid grid-cols-1 gap-2.5 scroll-mt-4 scroll-smooth" id="mobile-cards-container">
                {lmeHistoricalData
                  .slice(0, expandedMobileView ? lmeHistoricalData.length : 3)
                  .map((data, index) => (
                    <div 
                      id={`mobile-card-${index}`} 
                      key={`mobile-${index}`}
                      className="transition-all duration-300 hover:shadow-md"
                    >
                      <LMECashSettlement 
                        basePrice={data.basePrice}
                        spread={data.spread}
                        spreadINR={data.spreadINR}
                        isIncrease={data.isIncrease}
                        formattedDate={data.formattedDate}
                      />
                    </div>
                  ))}
              </div>
              
              {/* Show More / Show Less Button - only if we have more than 3 historical entries */}
              {lmeHistoricalData.length > 3 && (
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
          
          {/* Source attribution with navigation buttons - now placed at right bottom corner */}
          <div className="flex justify-between items-center mt-2 md:mt-3">
            <p className="text-sm text-gray-500">Source: Westmetals</p>
            
            {/* Navigation buttons - more functional and precise styling */}
            <div className="flex space-x-2">
              <button 
                onClick={() => {
                  if (isMobileView()) {
                    // For mobile view, use enhanced scroll function
                    const currentIndex = expandedMobileView ? 0 : Math.max(0, 3 - 1);
                    scrollToCard(currentIndex);
                  } else {
                    // For desktop view, use the slider's previous function
                    sliderRef.current?.slickPrev();
                  }
                }}
                disabled={sliderState.isAtStart && !isMobileView()}
                className={`w-9 h-9 flex items-center justify-center rounded-md
                  ${!isMobileView() && sliderState.isAtStart 
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
                  if (isMobileView()) {
                    // For mobile view, use enhanced scroll function
                    const visibleCards = expandedMobileView ? lmeHistoricalData.length : 3;
                    const nextIndex = Math.min(visibleCards - 1, 3);
                    scrollToCard(nextIndex);
                  } else {
                    // For desktop view, use the slider's next function
                    sliderRef.current?.slickNext();
                  }
                }}
                disabled={sliderState.isAtEnd && !isMobileView()}
                className={`w-9 h-9 flex items-center justify-center rounded-md
                  ${!isMobileView() && sliderState.isAtEnd 
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
      </section>

      {/* Main Grid Layout - Rearranged for mobile view */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* PriceAlert moved to bottom for mobile */}
        <div className="hidden md:block">
          <PriceAlert />
        </div>

        {/* Right Column */}
        <div className="space-y-2 mb-6">
          {/* MCX Aluminium */}
          <MCXAluminium />

          {/* LME, Month Price and Rates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-2">
              <LMEAluminium />
              <MonthPrice />
            </div>
            <div>
              <RatesDisplay />
            </div>
          </div>
        </div>
      </div>
      
      {/* Price Alert for mobile view - at bottom */}
      <div className="md:hidden">
        <PriceAlert />
      </div>

      {/* LME Cash Settlement Popup */}
      {showLMEPopup && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={closePopup}
        >
          <div 
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fadeIn overflow-hidden
              border border-gray-100 p-5 md:p-8"
            style={{
              animation: "fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative elements */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-100 rounded-full opacity-50 z-0"></div>
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-100 rounded-full opacity-50 z-0"></div>
            
            {/* Close button with improved positioning and styling */}
            <button 
              onClick={(e) => {
                e.stopPropagation(); // Prevent event bubbling
                console.log("Close button clicked"); // Debug log
                closePopup();
              }} 
              className="absolute top-3 right-3 md:top-4 md:right-4 z-20 h-8 w-8 md:h-10 md:w-10 flex items-center justify-center
                bg-white hover:bg-gray-100 rounded-full shadow-md border border-gray-300
                text-gray-700 hover:text-gray-900 transition-all duration-200
                cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transform hover:scale-105"
              aria-label="Close popup"
              type="button"
            >
              <X size={18} strokeWidth={2.5} className="md:hidden" />
              <X size={20} strokeWidth={2.5} className="hidden md:block" />
            </button>
            
            {/* Header with refined styling */}
            <div className="mb-5 md:mb-8 relative z-10">
              <h3 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-700 bg-clip-text text-transparent leading-tight">
                Today&apos;s LME Cash Settlement
              </h3>
              <div className="w-20 md:w-24 h-1 bg-gradient-to-r from-indigo-600 to-blue-600 mt-2 md:mt-3 rounded-full"></div>
            </div>
            
            {/* Content with refined styling */}
            <div className="space-y-5 md:space-y-8 relative z-10">
              {/* Price */}
              <div className="flex items-center gap-4 md:gap-6">
                <div className="p-3 md:p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200/50">
                  <DollarSign className="w-6 h-6 md:w-7 md:h-7 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1 md:mb-1.5">Settlement Price</p>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900 font-mono">${todaysLMEData.price.toFixed(2)}</p>
                </div>
              </div>
              
              {/* Date */}
              <div className="flex items-center gap-4 md:gap-6">
                <div className="p-3 md:p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl shadow-sm border border-indigo-200/50">
                  <Calendar className="w-6 h-6 md:w-7 md:h-7 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1 md:mb-1.5">Date</p>
                  <p className="text-lg md:text-xl font-medium text-gray-900">{todaysLMEData.date}</p>
                </div>
              </div>
              
              {/* Time */}
              <div className="flex items-center gap-4 md:gap-6">
                <div className="p-3 md:p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm border border-purple-200/50">
                  <Clock className="w-6 h-6 md:w-7 md:h-7 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1 md:mb-1.5">Time</p>
                  <p className="text-lg md:text-xl font-medium text-gray-900">{todaysLMEData.time}</p>
                </div>
              </div>
            </div>
            
            {/* Footer - without source attribution */}
            <div className="mt-6 md:mt-10 pt-3 md:pt-5 border-t border-gray-100 relative z-10">
              {/* Footer content removed as requested */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
