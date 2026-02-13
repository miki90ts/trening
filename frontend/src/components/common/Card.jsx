import React from 'react';

function Card({ className = '', children, onClick }) {
  return (
    <div className={`card ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}

export default Card;
