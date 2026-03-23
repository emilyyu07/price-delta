import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import { useAuth } from "../../hooks/useAuth";
import { useDemo } from "../../contexts/DemoContext";
import { ProductGrid } from "../products/ProductGrid";
import { productsApi } from "../../api/products.js";
import { alertsApi } from "../../api/alerts.js";
import { notificationsApi } from "../../api/notifications.js";
import {ProductTracker} from "./ProductTracker";
import { AlertCircle, Tag, TrendingDown, Package } from "lucide-react";
import { AnimatedStatCard } from "../ui/AnimatedStats";
import { PageTransition } from "../ui/PageTransitions";
import { ParallaxBackground } from "../ui/PageTransitions";
import type { Product } from "../../types/index.js";

const Dashboard = () => {
    const { user } = useAuth();
    const { isDemoMode, products: demoProductsList, alerts: demoAlertsList, notifications: demoNotificationsList } = useDemo();
    const navigate = useNavigate(); // Initialize useNavigate
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Stats from HomePage
    const [activeAlertsCount, setActiveAlertsCount] = useState<number>(0);
    const [priceDropsCount, setPriceDropsCount] = useState<number>(0);
    const [dealsNotifiedCount, setDealsNotifiedCount] = useState<number>(0);

    useEffect(() => {
        // If in demo mode, use demo data directly
        if (isDemoMode) {
            setProducts(demoProductsList.slice(0, 4));
            setLoadingProducts(false);
            
            // Calculate stats from demo data
            const activeAlerts = demoAlertsList.filter(a => a.isActive);
            const priceDrops = demoNotificationsList.filter(n => n.type === 'PRICE_DROP');
            const dealsNotified = demoNotificationsList.filter(n => n.type === 'PRICE_DROP' || n.type === 'TARGET_REACHED');
            
            setActiveAlertsCount(activeAlerts.length);
            setPriceDropsCount(priceDrops.length);
            setDealsNotifiedCount(dealsNotified.length);
            
            return;
        }

        // Otherwise, fetch from API
        const fetchProducts = async () => {
            try {
                setLoadingProducts(true);
                const fetchedProducts = await productsApi.getAll();
                setProducts(fetchedProducts.slice(0, 4)); // Displaying maximum 4 products
            } catch (err) {
                console.error("Failed to fetch products:", err);
                setError("Failed to load products. Please try again later.");
            } finally {
                setLoadingProducts(false);
            }
        };
        
        const fetchStats = async () => {
            try {
                const [alerts, notifications] = await Promise.all([
                    alertsApi.getAlerts(),
                    notificationsApi.getNotifications(),
                ]);
                const activeAlerts = Array.isArray(alerts) ? alerts.filter((a: { isActive?: boolean }) => a.isActive !== false) : [];
                const priceDrops = Array.isArray(notifications) ? notifications.filter((n: { type: string }) => n.type === 'PRICE_DROP') : [];
                const dealsNotified = Array.isArray(notifications) ? notifications.filter((n: { type: string }) => n.type === 'PRICE_DROP' || n.type === 'TARGET_REACHED') : [];
                setActiveAlertsCount(activeAlerts.length);
                setPriceDropsCount(priceDrops.length);
                setDealsNotifiedCount(dealsNotified.length);
            } catch {
                setActiveAlertsCount(0);
                setPriceDropsCount(0);
                setDealsNotifiedCount(0);
            }
        };
        
        fetchProducts();
        fetchStats();
    }, [isDemoMode, demoProductsList, demoAlertsList, demoNotificationsList]);

    const handleProductClick = (productId: string) => {
      navigate(`/products/${productId}`); 
    };

    return (
        <PageTransition type="fade">
            <ParallaxBackground intensity={0.1}>
                <div className="p-4">
                    {/* Merged Banner Section */}
                    <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-8 text-white mb-8 animate-gradient-shift">
                        <h1 className="text-4xl font-bold font-chic mb-2">Welcome back, {user?.name || user?.email || 'there'}!</h1>
                        <p className="text-xl mb-4 font-sleek">Your prices — on a leash. Set your price. We'll do the stalking.</p>
                        <p className="text-primary-100 mb-6 font-sleek">We look down so your savings go up. Check out your next big save!</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid md:grid-cols-3 gap-6 mb-8">
                        <AnimatedStatCard
                            title="Active Alerts"
                            value={activeAlertsCount}
                            icon={<AlertCircle className="h-6 w-6" />}
                            description="Watching for price drops"
                            color="primary"
                            delay={0}
                        />

                        <AnimatedStatCard
                            title="Price Drops"
                            value={priceDropsCount}
                            icon={<TrendingDown className="h-6 w-6" />}
                            description="Price drop notifications"
                            color="success"
                            delay={200}
                        />

                        <AnimatedStatCard
                            title="Deals Notified"
                            value={dealsNotifiedCount}
                            icon={<Tag className="h-6 w-6" />}
                            description="Deal notifications sent"
                            color="accent"
                            delay={400}
                        />
                    </div>

                    {/* Product Tracker or Demo Message */}
                    {isDemoMode ? (
                        <div className="frosted-surface mb-8 rounded-2xl border p-8">
                            <div className="flex items-center gap-4 text-center justify-center">
                                <Package className="h-8 w-8 text-primary-500" />
                                <div>
                                    <h3 className="text-xl font-bold font-chic text-primary-900 mb-1">
                                        Product Tracking
                                    </h3>
                                    <p className="text-sm text-primary-600 font-sleek">
                                        Product tracking requires the backend to be running locally
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <ProductTracker />
                    )}

                    {/* Previously Searched Items */}
                    <h2 className="text-xl font-semibold font-chic text-primary-700 mb-4">Previously Searched Items</h2>
                    {loadingProducts ? (
                        <p className="text-primary-600 font-sleek">Loading products...</p>
                    ) : error ? (
                        <p className="text-danger font-sleek">{error}</p>
                    ) : products.length > 0 ? (
                        <ProductGrid products={products} onProductClick={handleProductClick} />
                    ) : (
                        <p className="text-primary-600 font-sleek">No products found. Start tracking your first item!</p>
                    )}
                </div>
            </ParallaxBackground>
        </PageTransition>
    );
};

export default Dashboard;
