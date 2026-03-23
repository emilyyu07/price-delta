import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { AlertCircle, Trash2, Pencil, Check, X } from 'lucide-react';
import { alertsApi } from '../api/alerts';
import { useDemo } from '../contexts/DemoContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { ConfirmModal } from '../components/common/ConfirmModal';
import type { PriceAlert } from '../types';
import { useAuth } from '../hooks/useAuth';

export const AlertsPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { isDemoMode, alerts: demoAlertsList } = useDemo();
  const navigate = useNavigate(); 
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [editTargetPrice, setEditTargetPrice] = useState<string>('');

  // State for delete confirmation modal
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const fetchedAlerts: PriceAlert[] = await alertsApi.getAlerts();
      setAlerts(fetchedAlerts);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError('Failed to load alerts. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // If in demo mode, use demo data
    if (isDemoMode) {
      setAlerts(demoAlertsList);
      setLoading(false);
      return;
    }

    // Otherwise, fetch from API if authenticated
    if (isAuthenticated) {
      fetchAlerts();
    }
  }, [isAuthenticated, isDemoMode, demoAlertsList]);

  const handleDeleteAlert = async () => {
    if (!pendingDeleteId) return;

    // Disable delete in demo mode
    if (isDemoMode) {
      setError('Delete is not available in demo mode.');
      setPendingDeleteId(null);
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      await alertsApi.delete(pendingDeleteId);
      setAlerts(alerts.filter(alert => alert.id !== pendingDeleteId));
    } catch (err) {
      console.error('Error deleting alert:', err);
      setError('Failed to delete alert. Please try again.');
    } finally {
      setPendingDeleteId(null);
    }
  };

  const handleEditClick = (alert: PriceAlert) => {
    // Disable edit in demo mode
    if (isDemoMode) {
      setError('Editing is not available in demo mode.');
      setTimeout(() => setError(null), 3000);
      return;
    }
    setEditingAlertId(alert.id);
    setEditTargetPrice(alert.targetPrice ? parseFloat(alert.targetPrice).toString() : '');
  };

  const handleCancelEdit = () => {
    setEditingAlertId(null);
    setEditTargetPrice('');
  };

  const handleSaveEdit = async (alertId: string) => {
    const price = parseFloat(editTargetPrice);
    if (isNaN(price) || price <= 0) {
      setError('Please enter a valid target price.');
      return;
    }

    try {
      const { alert: updatedAlert } = await alertsApi.update(alertId, { targetPrice: price });
      setAlerts(alerts.map(a => a.id === alertId ? { ...a, targetPrice: updatedAlert.targetPrice } : a));
      setEditingAlertId(null);
      setEditTargetPrice('');
      setError(null);
    } catch (err) {
      console.error('Error updating alert:', err);
      setError('Failed to update alert. Please try again.');
    }
  };

  const handleCreateAlert = () => {
    navigate('/products'); // Use navigate to go to products page
  };

  // Derive the alert being deleted for the modal message
  const pendingAlert = pendingDeleteId
    ? alerts.find(a => a.id === pendingDeleteId)
    : null;

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-primary-900">Price Alerts</h1>
        <Button onClick={handleCreateAlert} variant="primary">
          Create New Alert
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-primary-800">Loading your alerts...</div>
      ) : error ? (
        <div className="text-red-500 text-center py-10">{error}</div>
      ) : alerts.length === 0 ? (
        <Card className="frosted-surface text-center py-8">
          <AlertCircle className="h-12 w-12 text-primary-400 mx-auto mb-4" />
          <p className="text-primary-600 mb-4">
            Your watchlist is empty. Let's give it something to do.
          </p>
          <p className="text-sm text-primary-500">
            Tell us what you want. We'll tell you when it's actually worth buying.
          </p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">
            Browse New Items
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <Card key={alert.id} className="frosted-surface flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={alert.product?.imageUrl || 'https://via.placeholder.com/48'}
                  alt={alert.product?.title || 'Product'}
                  className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
                />
                <div>
                  <h3 className="text-lg font-semibold text-primary-800">
                    {alert.product?.title || 'Unknown Product'}
                  </h3>
                  {editingAlertId === alert.id ? (
                    <div className="flex items-center gap-2 mt-1 mb-2">
                      <span className="text-primary-600 font-medium whitespace-nowrap">Target Price: $</span>
                      <Input
                        type="number"
                        value={editTargetPrice}
                        onChange={(e) => setEditTargetPrice(e.target.value)}
                        className="w-24 px-2 py-1"
                      />
                    </div>
                  ) : (
                    <p className="text-primary-600">
                      Target Price: ${alert.targetPrice ? parseFloat(alert.targetPrice).toFixed(2) : 'N/A'}
                    </p>
                  )}
                  <p className="text-sm text-primary-500">
                    Created: {alert.createdAt ? new Date(alert.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {editingAlertId === alert.id ? (
                  <>
                    <Button variant="primary" size="sm" onClick={() => handleSaveEdit(alert.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleCancelEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => handleEditClick(alert)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setPendingDeleteId(alert.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={pendingDeleteId !== null}
        title="Delete Alert?"
        message={
          pendingAlert?.product?.title
            ? `This will permanently remove the price alert for "${pendingAlert.product.title}". You won't receive notifications for this product anymore.`
            : 'Are you sure you want to delete this alert? This action cannot be undone.'
        }
        confirmLabel="Delete"
        cancelLabel="Keep Alert"
        onConfirm={handleDeleteAlert}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
};

