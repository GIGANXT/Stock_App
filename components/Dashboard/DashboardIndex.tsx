import React, { useState, useEffect, useCallback, useRef } from "react";
import LMECashSettlement from "./LMECashSettlement";
import PriceAlert from "./PriceAlert";
import MCXAluminium from "./MCXAluminium";
import LMEAluminium from "./LMEAluminium";
import MonthPrice from "./MonthPrice";
import RatesDisplay from "./RatesDisplay";
import LiveSpotCard from "./LiveSpotCard";
import FeedbackBanner from "./FeedbackBanner";
import { X, Clock, Calendar, DollarSign, AlertTriangle } from "lucide-react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { format } from "date-fns";

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

// New interface for the cash settlement data from metal-price API
interface MetalPriceCashSettlement {
  type: 'cashSettlement';
  cashSettlement: number;
  dateTime: string;
}

// Interface for the normal metal price data
interface MetalPriceData {
  type: 'spotPrice';
  spotPrice: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

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

// Define a more complete Slider interface that includes slickSetOption
interface ExtendedSlider extends Slider {
  slickSetOption: (option: string, value: any, refresh: boolean) => void;
}

export default function MarketDashboard() {
  const currentDate = new Date();
  const [showLMEPopup, setShowLMEPopup] = useState(false);
  const sliderRef = useRef<ExtendedSlider>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const gestureCleanup = useRef<GestureCleanup | null>(null);
  const [expandedMobileView, setExpandedMobileView] = useState(false);
  const [sliderState, setSliderState] = useState<SliderState>({
    isAtStart: true,
    isAtEnd: false,
    currentIndex: 0
  });
  const [lmeData, setLmeData] = useState<LMECashSettlementData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [latestLMEData, setLatestLMEData] = useState<LMECashSettlementData | null>(null);
  const [cashSettlementData, setCashSettlementData] = useState<MetalPriceCashSettlement | null>(null);
  const [metalPriceData, setMetalPriceData] = useState<MetalPriceData | null>(null);

  // Fetch Metal Price data which might include cash settlement data
  useEffect(() => {
    const fetchMetalPriceData = async () => {
      try {
        // Add cache-busting query parameter and headers
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/metal-price?forceMetalPrice=true&returnAverage=false&_t=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch metal price data');
        }

        const data = await response.json();

        // Store metal price data
        if (data.type === 'spotPrice') {
          setMetalPriceData(data as MetalPriceData);
        }
      } catch (error) {
        console.error('Error fetching metal price data:', error);
      }
    };

    fetchMetalPriceData();

    // Set up polling interval (every 2 minutes)
    const intervalId = setInterval(fetchMetalPriceData, 2 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Fetch cash settlement data
  useEffect(() => {
    const fetchCashSettlementData = async () => {
      try {
        // Add cache-busting query parameter and headers
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/cash-settlement?_t=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch cash settlement data');
        }

        const data = await response.json();

        // Store cash settlement data
        if (data.type === 'cashSettlement') {
          setCashSettlementData(data as MetalPriceCashSettlement);
        }
      } catch (error) {
        console.error('Error fetching cash settlement data:', error);
      }
    };

    fetchCashSettlementData();

    // Set up polling interval (every 5 minutes)
    const intervalId = setInterval(fetchCashSettlementData, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Fetch LME Cash Settlement data from the API
  useEffect(() => {
    const fetchLMEData = async () => {
      try {
        setIsLoading(true);
        // Add cache-busting query parameter and headers
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/lmecashcal?_t=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch LME data');
        }

        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setLmeData(result.data);
          // Set the latest LME data for the popup
          if (result.data.length > 0) {
            setLatestLMEData(result.data[0]);
          }
          
          // Initialize slider state right after data loads
          setTimeout(() => {
            if (sliderRef.current) {
              // Reset to first slide and update state
              sliderRef.current.slickGoTo(0);
              // We can't use updateSliderState here because it's not defined yet
              // Instead, manually update the state based on current slider state
              const updateSlider = () => {
                if (sliderRef.current?.innerSlider) {
                  const innerSlider = sliderRef.current.innerSlider as ExtendedInnerSlider;
                  const { currentSlide, slideCount } = innerSlider.state;
                  const slidesToShow = sliderRef.current.props.slidesToShow || 3;
                  
                  // Determine if we're at the start or end
                  const isAtStart = currentSlide === 0;
                  const isAtEnd = currentSlide + slidesToShow >= slideCount;
                  
                  // Update slider state
                  setSliderState({
                    isAtStart,
                    isAtEnd,
                    currentIndex: currentSlide
                  });
                }
              };
              
              updateSlider();
              setTimeout(updateSlider, 100);
              setTimeout(updateSlider, 300);
            }
          }, 200);
        }
      } catch (error) {
        console.error('Error fetching LME data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLMEData();
  }, []);

  // Format date from API data (e.g., "2023-05-30" to "30. May 2023")
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const day = date.getDate();
      const month = date.toLocaleString('en-US', { month: 'long' });
      const year = date.getFullYear();
      return `${day}. ${month} ${year}`;
    } catch (e) {
      return dateString; // Return original string if parsing fails
    }
  };

  // Track and update the current slider state for UI enhancements
  const updateSliderState = useCallback(() => {
    // Safely access the slider state
    if (!sliderRef.current?.innerSlider) return;

    const innerSlider = sliderRef.current.innerSlider as ExtendedInnerSlider;
    const { currentSlide, slideCount } = innerSlider.state;
    const slidesToShow = sliderRef.current.props.slidesToShow || 3;

    // Determine if we're at the start or end
    const isAtStart = currentSlide === 0;
    const isAtEnd = currentSlide + slidesToShow >= slideCount;

    // Update slider state
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

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [updateSliderState]);

  // Add a specific effect to ensure navigation buttons work immediately after component mount
  useEffect(() => {
    // Wait for the component to fully render
    const initTimer = setTimeout(() => {
      updateSliderState();

      // Force a re-update after a brief delay to ensure stability
      setTimeout(updateSliderState, 500);
    }, 100);

    return () => clearTimeout(initTimer);
  }, [updateSliderState]);

  // Initial update with slight delay to ensure slider is fully rendered
  useEffect(() => {
    const initialTimer = setTimeout(updateSliderState, 300);

    return () => {
      clearTimeout(initialTimer);
    };
  }, [updateSliderState]);

  // After slider initialization and after every change
  const handleAfterChange = () => {
    updateSliderState();
  };

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
    const wheelHandler = function (this: Element, event: WheelEvent) {
      // Prevent the default browser behavior for wheel events on the slider
      event.preventDefault();

      if (!sliderRef.current) return;

      // Determine scroll direction
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      const isScrollingLeft = delta < 0;

      // Get current slider state
      const innerSlider = sliderRef.current.innerSlider as ExtendedInnerSlider;
      const { currentSlide, slideCount } = innerSlider.state;
      const slidesToShow = sliderRef.current.props.slidesToShow || 3;
      const isAtStart = currentSlide === 0;
      const isAtEnd = currentSlide + slidesToShow >= slideCount;

      // Prevent scrolling when we hit boundaries
      const isAtLeftBoundary = isAtStart && isScrollingLeft;
      const isAtRightBoundary = isAtEnd && !isScrollingLeft;

      if (isAtLeftBoundary || isAtRightBoundary) {
        // Add a visual feedback for blocked scrolling
        const slider = this.closest('.lme-slider') as HTMLElement;
        if (slider) {
          slider.classList.add('boundary-hit');
          setTimeout(() => slider.classList.remove('boundary-hit'), 300);
        }
        return;
      }

      // Perform the appropriate slider navigation based on scroll direction
      if (isScrollingLeft) {
        sliderRef.current.slickPrev();
      } else {
        sliderRef.current.slickNext();
      }

      // Update the slider state immediately after scrolling
      setTimeout(updateSliderState, 50);
    };

    // Add event listeners
    sliderElement.addEventListener('wheel', wheelHandler, { passive: false });

    // Clean up function that we'll return
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
        const wheelHandler = function (this: Element, e: WheelEvent) {
          // Prevent the default browser behavior for wheel events on the slider
          e.preventDefault();

          if (!sliderRef.current) return;

          // Determine scroll direction
          const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
          const isScrollingLeft = delta < 0;

          // Get current slider state
          const innerSlider = sliderRef.current.innerSlider as ExtendedInnerSlider;
          const { currentSlide, slideCount } = innerSlider.state;
          const slidesToShow = sliderRef.current.props.slidesToShow || 3;
          const isAtStart = currentSlide === 0;
          const isAtEnd = currentSlide + slidesToShow >= slideCount;

          // Prevent scrolling when we hit boundaries
          const isAtLeftBoundary = isAtStart && isScrollingLeft;
          const isAtRightBoundary = isAtEnd && !isScrollingLeft;

          if (isAtLeftBoundary || isAtRightBoundary) {
            // Add a visual feedback for blocked scrolling
            const slider = this.closest('.lme-slider') as HTMLElement;
            if (slider) {
              slider.classList.add('boundary-hit');
              setTimeout(() => slider.classList.remove('boundary-hit'), 300);
            }
            return;
          }

          // Perform the appropriate slider navigation based on scroll direction
          if (isScrollingLeft) {
            sliderRef.current.slickPrev();
          } else {
            sliderRef.current.slickNext();
          }

          // Update the slider state immediately after scrolling
          setTimeout(updateSliderState, 50);
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

  // Handle escape key to close the popup
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Close modal on escape key
    if (e.key === 'Escape') {
      setShowLMEPopup(false);
    }
  };

  // Determine which data to display in the LiveSpotCard
  const renderLiveSpotCard = () => {
    // First priority: Use Metal Price data if available
    if (metalPriceData) {
      return (
        <LiveSpotCard
          lastUpdated={new Date(metalPriceData.lastUpdated)}
          spotPrice={metalPriceData.spotPrice}
          change={metalPriceData.change}
          changePercent={metalPriceData.changePercent}
          unit="/MT"
          apiUrl="/api/metal-price?returnAverage=true"
        />
      );
    }
    
    // Second priority: If we have cash settlement data from the API, show it
    if (cashSettlementData) {
      return (
        <LiveSpotCard
          lastUpdated={new Date(cashSettlementData.dateTime)}
          spotPrice={cashSettlementData.cashSettlement}
          change={0}
          changePercent={0}
          unit="/MT"
          apiUrl="/api/metal-price?returnAverage=true"
        />
      );
    }

    // Third priority: use the latestLMEData
    if (latestLMEData) {
      return (
        <LiveSpotCard
          lastUpdated={new Date(latestLMEData.date)}
          spotPrice={latestLMEData.price}
          change={latestLMEData.Dollar_Difference}
          changePercent={latestLMEData.Dollar_Difference}
          unit="/MT"
          apiUrl="/api/metal-price?returnAverage=true"
        />
      );
    }

    // If no data is available, show placeholder card
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
              No price data available
            </p>
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between mt-auto pt-2 text-xs text-gray-500">
            <div className="font-bold">
              {format(new Date(), 'dd. MMMM yyyy')}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Determine which data to display in the LME Cash Settlement Popup
  const renderPopupData = () => {
    if (isLoading) {
      // Loading skeleton for the popup
      return (
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded-lg w-1/2 mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-5"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      );
    } else if (!latestLMEData && !cashSettlementData) {
      // No data available
      return (
        <div className="text-center py-6">
          <AlertTriangle size={40} className="mx-auto text-amber-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Settlement Data Available</h3>
          <p className="text-gray-600 mb-4">
            There is currently no LME Cash Settlement data available.
          </p>
          <p className="text-xs text-gray-500">
            The data will appear automatically when it becomes available.
          </p>
        </div>
      );
    } else if (cashSettlementData) {
      // Show cash settlement data if available
      return (
        <>
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={16} className="text-indigo-600" />
            <span className="text-sm font-medium">{formatDate(cashSettlementData.dateTime)}</span>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-gray-500" />
            <span className="text-xs text-gray-500">Last updated: {new Date(cashSettlementData.dateTime).toLocaleTimeString()}</span>
          </div>

          <div className="bg-indigo-50 p-3 rounded-lg mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">Price</span>
              <span className="text-lg font-bold text-indigo-700">${cashSettlementData.cashSettlement.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            <p>Cash settlement price for aluminum on the London Metal Exchange.</p>
          </div>
        </>
      );
    } else if (latestLMEData) {
      // Show LME data from database if cash settlement not available
      return (
        <>
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={16} className="text-indigo-600" />
            <span className="text-sm font-medium">{formatDate(latestLMEData.date)}</span>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-gray-500" />
            <span className="text-xs text-gray-500">Last updated: {new Date(latestLMEData.updatedAt).toLocaleTimeString()}</span>
          </div>

          <div className="bg-indigo-50 p-3 rounded-lg mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">Price</span>
              <span className="text-lg font-bold text-indigo-700">${latestLMEData.price.toFixed(2)}</span>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-3 mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Change (USD)</span>
              <span className={`text-sm font-medium ${latestLMEData.Dollar_Difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {latestLMEData.Dollar_Difference > 0 ? '+' : ''}{latestLMEData.Dollar_Difference.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Change (INR)</span>
              <span className={`text-sm font-medium ${latestLMEData.INR_Difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {latestLMEData.INR_Difference > 0 ? '+' : ''}₹{Number(latestLMEData.INR_Difference).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            <p>Cash settlement price for aluminum on the London Metal Exchange.</p>
          </div>
        </>
      );
    }
  };

  // Also set up swipe tracking on mobile
  useEffect(() => {
    const sliderElement = document.querySelector('.lme-slider');
    if (!sliderElement) return;

    // Create mutual observer to track state changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName !== 'class') return;

        const slider = mutation.target as HTMLElement;
        const isAtStart = slider.classList.contains('at-start');
        const isAtEnd = slider.classList.contains('at-end');

        // Visual edge indicators
        if (isAtStart) {
          const track = slider.querySelector('.slick-track') as HTMLElement;
          if (track) {
            track.style.marginLeft = '0';
          }
        }

        if (isAtEnd) {
          const track = slider.querySelector('.slick-track') as HTMLElement;
          if (track) {
            track.style.marginRight = '0';
          }
        }
      });
    });

    observer.observe(sliderElement, { attributes: true });

    return () => {
      observer.disconnect();
    };
  }, [updateSliderState]);

  // Setup gesture handlers for both desktop and mobile
  useEffect(() => {
    // Desktop - wheel scroll handler
    const cleanup = setupTrackpadGestures();
    if (cleanup) {
      gestureCleanup.current = cleanup;
    }

    // Mobile - touch-based handling already built into react-slick
    // But we'll add enhanced support for our UI feedback
    // This uses Hammer.js under the hood via react-slick

    return () => {
      // Clean up any gesture handlers
      if (gestureCleanup.current) {
        const { element, handler } = gestureCleanup.current;
        if (element && handler) {
          element.removeEventListener('wheel', handler);
        }
      }
    };
  }, [setupTrackpadGestures]);

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
            {(cashSettlementData || latestLMEData) && (
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
            )}
          </div>

          {/* Desktop View - Slider */}
          <div className="relative hidden md:flex items-stretch gap-4">
            {/* Fixed DelayedSpotCard (First Card) */}
            <div className="flex-shrink-0" style={{ width: '23%' }}>
              {renderLiveSpotCard()}
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
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : lmeData.length === 0 ? (
                  <div className="col-span-3 py-0.5 px-2">
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
                            {format(new Date(), 'dd. MMMM yyyy')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Real data cards
                  lmeData.map((data, index) => (
                    <div key={`static-${index + 1}`} className="h-full py-0.5 px-2">
                      <div className="h-full">
                        <LMECashSettlement
                          basePrice={data.price}
                          spread={data.Dollar_Difference}
                          spreadINR={Number(data.INR_Difference).toFixed(2)}
                          isIncrease={data.Dollar_Difference > 0}
                          formattedDate={formatDate(data.date)}
                        />
                      </div>
                    </div>
                  ))
                )}
              </Slider>
            </div>
          </div>

          {/* Mobile View - Stacked Cards with Show More button */}
          <div className="md:hidden">
            <div className="space-y-2.5">
              {/* Today's Card */}
              {renderLiveSpotCard()}

              {/* Mobile slider navigation controls - removed as they've been moved to bottom */}
              <div className="mt-4 flex justify-end">
                <div className="flex space-x-1.5">
                  {/* Original buttons removed since they've been moved to the bottom */}
                </div>
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
                        </div>
                      </div>
                    </div>
                  ))
                ) : lmeData.length === 0 ? (
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
                            {format(new Date(), 'dd. MMMM yyyy')}
                          </div>
                        </div>
                      </div>
                    </div>
                ) : (
                  lmeData
                    .slice(0, expandedMobileView ? lmeData.length : 3)
                    .map((data, index) => (
                      <div
                        key={`mobile-${index + 1}`}
                        id={`mobile-card-${index}`}
                      >
                        <LMECashSettlement
                          basePrice={data.price}
                          spread={data.Dollar_Difference}
                          spreadINR={Number(data.INR_Difference).toFixed(2)}
                          isIncrease={data.Dollar_Difference > 0}
                          formattedDate={formatDate(data.date)}
                        />
                      </div>
                    ))
                )}
              </div>

              {/* Show More / Show Less Button - only if we have more than 3 historical entries and not loading */}
              {!isLoading && lmeData.length > 3 && (
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
            <div className="hidden md:flex space-x-2">
              <button
                onClick={() => {
                  if (sliderRef.current) {
                    sliderRef.current.slickPrev();
                    setTimeout(updateSliderState, 50);
                    setTimeout(updateSliderState, 200);
                  }
                }}
                disabled={sliderState.isAtStart}
                className={`w-9 h-9 flex items-center justify-center rounded-md
                  ${sliderState.isAtStart
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
                    setTimeout(updateSliderState, 50);
                    setTimeout(updateSliderState, 200);
                  }
                }}
                disabled={sliderState.isAtEnd}
                className={`w-9 h-9 flex items-center justify-center rounded-md
                  ${sliderState.isAtEnd
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
          className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowLMEPopup(false)}
        >
          <div
            className="relative bg-white rounded-xl p-5 max-w-md w-full m-4 shadow-xl"
            onKeyDown={handleKeyDown}
            tabIndex={0}
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
              onClick={() => setShowLMEPopup(false)}
              aria-label="Close popup"
            >
              <X size={20} />
            </button>

            <div className="mb-4">
              <h3 className="text-xl font-bold text-indigo-700">LME Cash Settlement</h3>
              <p className="text-sm text-gray-600">Current day reference price</p>
            </div>

            {renderPopupData()}
          </div>
        </div>
      )}
    </div>
  );
}
