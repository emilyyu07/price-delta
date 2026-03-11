import React, { useState, useRef } from 'react';
import type { Product, ProductListing } from '../../types/index.js';

interface AnimatedProductCardProps {
  product: Product;
  onClick: (productId: string) => void;
}

export const AnimatedProductCard: React.FC<AnimatedProductCardProps> = ({ product, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const x = (e.clientX - centerX) / (rect.width / 2);
    const y = (e.clientY - centerY) / (rect.height / 2);
    
    setTilt({ x: y * -5, y: x * 5 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  };

  const imageUrl = product.imageUrl || 'https://via.placeholder.com/150';
  const lowestPriceListing = product.listings?.reduce((minListing: ProductListing | null, currentListing: ProductListing) => {
    const currentPriceNum = parseFloat(currentListing.currentPrice as string);
    const minPriceNum = minListing ? parseFloat(minListing.currentPrice as string) : Infinity;
    return (minPriceNum < currentPriceNum) ? minListing : currentListing;
  }, null);

  const priceDisplay = lowestPriceListing
    ? `$${parseFloat(lowestPriceListing.currentPrice).toFixed(2)} at ${lowestPriceListing.retailer?.name}`
    : 'Price not available';

  return (
    <div
      ref={cardRef}
      className="relative cursor-pointer transition-all duration-300 transform-gpu"
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.05 : 1})`,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={() => onClick(product.id)}
    >
      <div className="bg-surface p-6 rounded-xl border border-primary-200 shadow-sm font-sleek transition-all duration-300 hover:shadow-xl">
        {/* Image with shimmer effect */}
        <div className="relative overflow-hidden rounded-lg mb-4">
          <img 
            src={imageUrl} 
            alt={product.title} 
            className={`w-full h-64 object-cover transition-all duration-500 ${isHovered ? 'scale-110' : 'scale-100'}`}
          />
          {isHovered && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent animate-shimmer"></div>
          )}
        </div>
        
        {/* Content */}
        <h3 className="text-lg font-semibold font-chic text-primary-800 mb-2 leading-tight">
          {product.title}
        </h3>
        {product.category && (
          <p className="text-sm text-primary-500 font-sleek mb-3 uppercase tracking-wide">
            {product.category}
          </p>
        )}
        <div className="flex justify-between items-center">
          <span className="text-xl font-bold font-chic text-primary-600 animate-count-up">
            {priceDisplay}
          </span>
          {isHovered && (
            <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse"></div>
          )}
        </div>
      </div>
    </div>
  );
};
