import React from 'react';
import { Card } from '../common/Card';
import type { Product, ProductListing } from '../../types/index.js';

interface ProductCardProps {
  product: Product;
  onClick: (productId: string) => void;
  onDelete?: (productId: string, event: React.MouseEvent) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, onDelete }) => {
  const imageUrl = product.imageUrl || 'https://via.placeholder.com/150';

  const lowestPriceListing = product.listings?.reduce((minListing: ProductListing | null, currentListing: ProductListing) => {
    const currentPriceNum = parseFloat(currentListing.currentPrice as string);
    const minPriceNum = minListing ? parseFloat(minListing.currentPrice as string) : Infinity;
    return (minPriceNum < currentPriceNum) ? minListing : currentListing;
  }, null);

  const priceDisplay = lowestPriceListing
    ? `$${parseFloat(lowestPriceListing.currentPrice).toFixed(2)} at ${lowestPriceListing.retailer?.name}`
    : 'Price not available';

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onDelete) {
      onDelete(product.id, event);
    }
  };

  return (
    <Card className="frosted-surface cursor-pointer transition-all duration-300 hover:scale-105 relative" onClick={() => onClick(product.id)}>
      {onDelete && (
        <button
          onClick={handleDelete}
          className="absolute top-3 right-3 z-10 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors duration-200 shadow-md"
          title="Delete product"
          aria-label="Delete product"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      )}
      <img src={imageUrl} alt={product.title} className="w-full h-64 object-cover rounded-lg mb-4" />
      <h3 className="text-lg font-semibold font-chic text-primary-800 mb-2 leading-tight">{product.title}</h3>
      {product.category && (
        <p className="text-sm text-primary-500 font-sleek mb-3 uppercase tracking-wide">{product.category}</p>
      )}
      <div className="flex justify-between items-center">
        <span className="text-xl font-bold font-chic text-primary-600">{priceDisplay}</span>
      </div>
    </Card>
  );
};
