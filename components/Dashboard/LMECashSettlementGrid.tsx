import React, { useEffect, useState } from 'react';
import LMECashSettlement from './LMECashSettlement';
import axios from 'axios';

interface LMECashSettlementData {
  id: number;
  date: string;
  price: number;
  Dollar_Difference: number;
  INR_Difference: number;
  cardIndex: number;
  isActive: boolean;
  cardLabel?: string;
}

export default function LMECashSettlementGrid() {
  const [cards, setCards] = useState<LMECashSettlementData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/lmeCashSettlement');
        setCards(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching LME cash settlement data:', err);
        setError('Failed to load LME cash settlement data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Refresh data every 5 minutes
    const intervalId = setInterval(fetchData, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    return `${day}. ${month} ${year}`;
  };

  if (loading) {
    return <div className="text-center py-6">Loading LME cash settlement data...</div>;
  }

  if (error) {
    return <div className="text-center py-6 text-red-500">{error}</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4">
      {cards.map((card) => (
        <LMECashSettlement
          key={card.cardIndex}
          priceName={card.cardLabel || `LME Cash Settlement ${card.cardIndex + 1}`}
          basePrice={card.price}
          spread={card.Dollar_Difference}
          spreadINR={card.INR_Difference.toFixed(2)}
          isIncrease={card.Dollar_Difference > 0}
          formattedDate={formatDate(card.date)}
        />
      ))}
    </div>
  );
} 