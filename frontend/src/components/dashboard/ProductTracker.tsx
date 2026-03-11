import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { productsApi } from "../../api/products";
import { AnimatedButton } from "../ui/AnimatedButton";
import { LoadingSpinner } from "../ui/LoadingSpinner";

export const ProductTracker = () => {
  const navigate = useNavigate();

  // UI States
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'ERROR' | 'SUCCESS'>('IDLE');
  const [errorMessage, setErrorMessage] = useState("");
  const [progress, setProgress] = useState(0);
  
  // tracking State (Once the backend accepts the URL, we store the ID here)
  const [pendingListingId, setPendingListingId] = useState<string | null>(null);

  // submit handler
  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    try {
      setStatus('LOADING');
      setErrorMessage("");
      setProgress(0);

      const response = await productsApi.trackUrl(url);
      
      //save ID, start polling
      setPendingListingId(response.listingId);
      setProgress(25);
      
    } catch (err: unknown) {
      setStatus('ERROR');
      const errorMsg = err instanceof Error ? err.message : "Failed to track product.";
      setErrorMessage(errorMsg);
      setProgress(0);
    }
  };

  // polling hook with progress simulation
  useEffect(() => {
    // if no pending scrape job, ignore
    if (!pendingListingId) return;

    console.log(`Starting polling for listing: ${pendingListingId}`);

    // progress simulation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev < 75) return prev + 5;
        return prev;
      });
    }, 200);

    // run every 3s
    const intervalId = setInterval(async () => {
      try {
        // ping backend
        const response = await productsApi.getTrackStatus(pendingListingId);
        
        if (response.status === 'COMPLETED') {
          console.log("Scrape completed! Redirecting...");
          
          // Stop the loading spinner
          setStatus('SUCCESS'); 
          setProgress(100);
          
          // Redirect the user to product page after a short delay
          setTimeout(() => {
            navigate(`/products/${response.productId}`);
          }, 1000);
          
        } else if (response.status === 'FAILED') {
          setStatus('ERROR');
          setErrorMessage("Failed to scrape Aritzia. The target might be blocking us.");
          setProgress(0);
        }
        // If status is still 'PENDING', we do nothing. The timer will just check again in 3 seconds.

      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 3000); 

    // cleanup (remove timer when component unmounts)
    return () => {
      console.log("Cleaning up polling timer.");
      clearInterval(intervalId);
      clearInterval(progressInterval);
    };

  }, [pendingListingId, navigate]); 

  // UI Rendering
  return (
    <div className="bg-gradient-to-br from-surface via-white to-surface p-8 rounded-2xl shadow-xl border border-primary-100 mb-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-chic text-primary-900 mb-2 bg-gradient-to-r from-primary-700 to-primary-900 bg-clip-text text-transparent">
          Track a New Item
        </h2>
        <p className="text-sm text-primary-600 font-sleek">
          Paste an Aritzia URL below to start tracking its price in real-time
        </p>
      </div>

      {status === 'IDLE' || status === 'ERROR' ? (
        <form onSubmit={handleTrack} className="space-y-4">
          <div className="relative">
            <input
              type="url"
              placeholder="https://www.aritzia.com/en/product/..."
              className="w-full p-4 border-2 border-primary-200 rounded-xl focus:ring-4 focus:ring-primary-100 focus:border-primary-400 transition-all duration-300 text-primary-800 placeholder-primary-400 bg-white/80 backdrop-blur-sm"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse"></div>
            </div>
          </div>
          
          <AnimatedButton 
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            loading={status === 'LOADING' || status === 'SUCCESS'}
          >
            {(status === 'LOADING' || status === 'SUCCESS') ? 'Deploying Price Bot...' : 'Track Price'}
          </AnimatedButton>
        </form>
      ) : (
        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="relative">
            <div className="w-full bg-primary-100 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
            <div className="text-center mt-2">
              <span className="text-sm font-medium text-primary-700">{progress}%</span>
            </div>
          </div>

          {/* Loading Status */}
          <div className="flex items-center justify-center gap-4 p-6 bg-gradient-to-r from-primary-50 to-accent-50 rounded-xl border border-primary-200">
            <LoadingSpinner size="lg" />
            <div className="text-center">
              <p className="font-semibold text-primary-800 mb-1">
                {status === 'SUCCESS' ? '✨ Product Added Successfully!' : '🤖 Deploying Bot to Aritzia...'}
              </p>
              <p className="text-sm text-primary-600">
                {status === 'SUCCESS' 
                  ? 'Redirecting to your product page...' 
                  : 'Please wait while we fetch the latest pricing data.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {status === 'ERROR' && (
        <div className="mt-4 p-4 bg-danger/10 border border-danger/30 rounded-xl">
          <p className="text-danger font-medium text-sm">{errorMessage}</p>
        </div>
      )}
    </div>
  );
};