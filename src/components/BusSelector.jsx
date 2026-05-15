import React, { useMemo } from 'react';
import { useData } from '../context/DataContext';
import './BusSelector.css';

export default function BusSelector({ 
  busType, 
  selectedSeats, 
  memberCount, 
  tripId, 
  currentLeadId,
  onSeatsChange 
}) {
  const { leads } = useData();

  // Calculate which seats are already taken for this specific trip
  const occupiedSeats = useMemo(() => {
    if (!tripId) return [];
    
    return leads
      .filter(l => 
        l.id !== currentLeadId && 
        l.tripId === tripId && 
        l.status === 'مؤكد' &&
        Array.isArray(l.seats)
      )
      .reduce((acc, l) => [...acc, ...l.seats], []);
  }, [leads, tripId, currentLeadId]);

  const totalSeats = busType === 'VIP 30' ? 30 : (busType === 'سياحي 51' ? 51 : 49);

  const handleSeatClick = (seatNum) => {
    if (occupiedSeats.includes(seatNum)) return;

    let newSeats = [...selectedSeats];
    
    if (newSeats.includes(seatNum)) {
      // Remove seat
      newSeats = newSeats.filter(s => s !== seatNum);
    } else {
      // Add seat(s)
      if (memberCount > 1) {
        // Try to pick memberCount adjacent seats starting from seatNum
        const block = [];
        for (let i = 0; i < memberCount; i++) {
          const nextSeat = seatNum + i;
          if (nextSeat <= totalSeats && !occupiedSeats.includes(nextSeat)) {
            block.push(nextSeat);
          } else {
            break; // Can't complete the block
          }
        }
        
        // If we can't get the full block, just toggle the single seat or warn?
        // Let's just add what we can, but usually user wants the full block
        if (block.length > 0) {
          // If already has some seats, should we replace or add?
          // The user said "كتلة واحدة", so let's replace
          newSeats = block;
        }
      } else {
        // Single seat toggle
        newSeats = [seatNum];
      }
    }
    
    onSeatsChange(newSeats);
  };

  const renderSeats = () => {
    const seats = [];
    const cols = busType === 'VIP 30' ? 3 : 4;
    
    for (let i = 1; i <= totalSeats; i++) {
      const isOccupied = occupiedSeats.includes(i);
      const isSelected = selectedSeats.includes(i);
      
      seats.push(
        <button
          key={i}
          type="button"
          className={`seat ${isOccupied ? 'occupied' : ''} ${isSelected ? 'selected' : ''}`}
          onClick={() => handleSeatClick(i)}
          disabled={isOccupied}
          title={isOccupied ? 'محجوز' : `كرسي ${i}`}
        >
          {i}
        </button>
      );
    }
    return seats;
  };

  if (!tripId) {
    return <div className="bus-selector-warning">يرجى اختيار الرحلة أولاً</div>;
  }

  return (
    <div className={`bus-container ${busType.replace(' ', '-').toLowerCase()}`}>
      <div className="bus-front">الأمام (السائق)</div>
      <div className="seats-grid">
        {renderSeats()}
      </div>
      <div className="bus-legend">
        <span className="legend-item"><span className="box available"></span> متاح</span>
        <span className="legend-item"><span className="box selected"></span> اختيارك</span>
        <span className="legend-item"><span className="box occupied"></span> محجوز</span>
      </div>
    </div>
  );
}
