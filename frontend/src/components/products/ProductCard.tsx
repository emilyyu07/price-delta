import React from 'react';
import { Card } from '../common/Card';
import type { Product, ProductListing } from '../../types/index.js'; // Import ProductListing

interface ProductCardProps {
  product: Product;
  onClick: (productId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const imageUrl = product.imageUrl || 'https://via.placeholder.com/150'; // Default image

  // Find the lowest current price across all listings for display
  const lowestPriceListing = product.listings?.reduce((minListing: ProductListing | null, currentListing: ProductListing) => {
    const currentPriceNum = parseFloat(currentListing.currentPrice as string);
    const minPriceNum = minListing ? parseFloat(minListing.currentPrice as string) : Infinity;
    return (minPriceNum < currentPriceNum) ? minListing : currentListing;
  }, null);

  const priceDisplay = lowestPriceListing
    ? `$${parseFloat(lowestPriceListing.currentPrice).toFixed(2)} at ${lowestPriceListing.retailer?.name}`
    : 'Price not available';

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105" onClick={() => onClick(product.id)}>
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