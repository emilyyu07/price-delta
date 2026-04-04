import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsApi } from '../api/products';
import { ProductGrid } from '../components/products/ProductGrid';
import { useDemo } from '../hooks/useDemo';
import type { Product } from '../types';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { useAuth } from '../hooks/useAuth';

export const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isDemoMode, products: demoProductsList } = useDemo();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // State for delete confirmation modal
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Fetch products from backend on mount
  useEffect(() => {
    // If in demo mode, use demo data directly
    if (isDemoMode) {
      setProducts(demoProductsList);
      setLoading(false);
      return;
    }

    // Otherwise, fetch from API
    const fetchAllProducts = async () => {
      try {
        setLoading(true);
        const data: Product[] = await productsApi.getAll();
        setProducts(data);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError("Failed to load products. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchAllProducts();
  }, [isDemoMode, demoProductsList]);

  const handleProductClick = (productId: string) => {
    navigate(`/products/${productId}`);
  };

  const handleSearch = () => {
    setSearchQuery(searchInput.trim().toLowerCase());
  };

  // Called from ProductCard trash icon — opens the modal
  const handleRequestDelete = (productId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    // Disable delete in demo mode
    if (isDemoMode) {
      setDeleteError('Delete is not available in demo mode.');
      setTimeout(() => setDeleteError(null), 5000);
      return;
    }

    if (!isAuthenticated) {
      setDeleteError('You must be logged in to delete products.');
      setTimeout(() => setDeleteError(null), 5000);
      return;
    }

    setPendingDeleteId(productId);
  };

  // Called when the user confirms deletion in the modal
  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await productsApi.delete(pendingDeleteId);
      setProducts(products.filter(p => p.id !== pendingDeleteId));
      setDeleteError(null);
    } catch (err) {
      console.error('Error deleting product:', err);
      const errorMessage = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to delete product. Please try again.';
      setDeleteError(errorMessage);
      setTimeout(() => setDeleteError(null), 5000);
    } finally {
      setPendingDeleteId(null);
    }
  };

  const filteredProducts = products.filter((product) => {
    if (!searchQuery) {
      return true;
    }

    const title = product.title.toLowerCase();
    const category = product.category?.toLowerCase() ?? "";
    return title.includes(searchQuery) || category.includes(searchQuery);
  });

  // Derive the product being deleted for the modal message
  const pendingProduct = pendingDeleteId
    ? products.find(p => p.id === pendingDeleteId)
    : null;

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary-900 mb-4">Browse Tracked Products</h1>
        
        {/* Delete Error Message */}
        {deleteError && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {deleteError}
          </div>
        )}

        {/* Search Bar */}
        <div className="flex gap-4 mb-6">
          <Input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search products..."
            className="flex-1"
          />
          <Button onClick={handleSearch}>
            Search
          </Button>
        </div>
      </div>

      {/* Product Grid Integration */}
      {loading ? (
        <div className="text-center py-10 text-primary-800">Loading products...</div>
      ) : error ? (
        <div className="text-red-500 text-center py-10">{error}</div>
      ) : filteredProducts.length > 0 ? (
        <ProductGrid 
          products={filteredProducts} 
          onProductClick={handleProductClick}
          onProductDelete={isAuthenticated ? handleRequestDelete : undefined}
        />
      ) : (
        <Card className="frosted-surface text-center py-8">
          <p className="text-primary-600">
            {searchQuery
              ? "No products match your search."
              : "No products found in the database."}
          </p>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={pendingDeleteId !== null}
        title="Delete Product?"
        message={
          pendingProduct?.title
            ? `Are you sure you want to delete "${pendingProduct.title}"?\n\nThis will permanently remove all price history, user alerts, and related notifications. This action cannot be undone.`
            : 'Are you sure you want to delete this product? This action cannot be undone.'
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
};

