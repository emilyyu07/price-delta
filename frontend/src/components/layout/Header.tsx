import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useDemo } from '../../hooks/useDemo';
import { Menu, X } from 'lucide-react';

export const Header: React.FC = () => {
  const { logout, isAuthenticated } = useAuth();
  const { isDemoMode } = useDemo();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  // Show navigation if authenticated OR in demo mode
  const showNavigation = isAuthenticated || isDemoMode;

  return (
    <header className={`fixed left-0 right-0 z-50 bg-primary-50/60 backdrop-blur-xl border-b border-primary-200/30 shadow-lg ${isDemoMode ? 'top-[52px]' : 'top-0'}`}>
      <div className="container mx-auto flex justify-between items-center py-8 px-4">
        <h1 className="text-2xl font-bold font-chic">
          <Link to="/" className="flex items-center gap-2 bg-gradient-to-r from-primary-700 to-primary-900 bg-clip-text text-transparent hover:from-primary-600 hover:to-primary-800 transition-all duration-300">
            <img src="/favicon.png" alt="PriceDelta logo" className="h-7 w-7 object-contain" />
            PriceDelta
          </Link>
        </h1>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {showNavigation ? (
            <>
              <Link 
                to="/dashboard" 
                className="px-4 py-3 rounded-xl text-sm font-medium font-sleek text-primary-800 bg-primary-100/50 hover:bg-primary-100/70 backdrop-blur-sm border border-primary-200/40 hover:border-primary-200/60 transition-all duration-300 hover:shadow-md hover:scale-105"
                onClick={closeMenu}
              >
                Dashboard
              </Link>
              <Link 
                to="/products" 
                className="px-4 py-3 rounded-xl text-sm font-medium font-sleek text-primary-800 bg-primary-100/50 hover:bg-primary-100/70 backdrop-blur-sm border border-primary-200/40 hover:border-primary-200/60 transition-all duration-300 hover:shadow-md hover:scale-105"
                onClick={closeMenu}
              >
                Products
              </Link>
              <Link 
                to="/alerts" 
                className="px-4 py-3 rounded-xl text-sm font-medium font-sleek text-primary-800 bg-primary-100/50 hover:bg-primary-100/70 backdrop-blur-sm border border-primary-200/40 hover:border-primary-200/60 transition-all duration-300 hover:shadow-md hover:scale-105"
                onClick={closeMenu}
              >
                Alerts
              </Link>
              <Link 
                to="/notifications" 
                className="px-4 py-3 rounded-xl text-sm font-medium font-sleek text-primary-800 bg-primary-100/50 hover:bg-primary-100/70 backdrop-blur-sm border border-primary-200/40 hover:border-primary-200/60 transition-all duration-300 hover:shadow-md hover:scale-105"
                onClick={closeMenu}
              >
                Notifications
              </Link>
              <Link 
                to="/profile" 
                className="px-4 py-3 rounded-xl text-sm font-medium font-sleek text-primary-800 bg-primary-100/50 hover:bg-primary-100/70 backdrop-blur-sm border border-primary-200/40 hover:border-primary-200/60 transition-all duration-300 hover:shadow-md hover:scale-105"
                onClick={closeMenu}
              >
                Profile
              </Link>
              <button 
                onClick={logout} 
                className="px-4 py-3 rounded-xl text-sm font-semibold font-chic bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 transition-all duration-300 hover:shadow-lg hover:scale-105 border border-primary-500/20"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link 
                to="/login" 
                className="px-4 py-3 rounded-xl text-sm font-medium font-sleek text-primary-800 bg-primary-100/50 hover:bg-primary-100/70 backdrop-blur-sm border border-primary-200/40 hover:border-primary-200/60 transition-all duration-300 hover:shadow-md hover:scale-105"
                onClick={closeMenu}
              >
                Login
              </Link>
              <Link 
                to="/register" 
                className="px-4 py-3 rounded-xl text-sm font-semibold font-chic bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 transition-all duration-300 hover:shadow-lg hover:scale-105 border border-primary-500/20"
                onClick={closeMenu}
              >
                Register
              </Link>
            </>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button 
          onClick={toggleMenu}
          className="md:hidden p-3 rounded-xl text-primary-800 bg-primary-100/50 hover:bg-primary-100/70 backdrop-blur-sm border border-primary-200/40 hover:border-primary-200/60 transition-all duration-300 hover:shadow-md hover:scale-105"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Navigation - Fixed positioning */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-primary-50/80 backdrop-blur-xl border-t border-primary-200/30 shadow-xl z-50">
          <nav className="container mx-auto py-6 px-4 flex flex-col space-y-3">
            {showNavigation ? (
              <>
                <Link 
                  to="/dashboard" 
                  className="block px-4 py-3 rounded-xl text-sm font-medium font-sleek text-primary-800 bg-primary-100/50 hover:bg-primary-100/70 backdrop-blur-sm border border-primary-200/40 hover:border-primary-200/60 transition-all duration-300 hover:shadow-md hover:scale-105"
                  onClick={closeMenu}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/products" 
                  className="block px-4 py-3 rounded-xl text-sm font-medium font-sleek text-primary-800 bg-primary-100/50 hover:bg-primary-100/70 backdrop-blur-sm border border-primary-200/40 hover:border-primary-200/60 transition-all duration-300 hover:shadow-md hover:scale-105"
                  onClick={closeMenu}
                >
                  Products
                </Link>
                <Link 
                  to="/alerts" 
                  className="block px-4 py-3 rounded-xl text-sm font-medium font-sleek text-primary-800 bg-primary-100/50 hover:bg-primary-100/70 backdrop-blur-sm border border-primary-200/40 hover:border-primary-200/60 transition-all duration-300 hover:shadow-md hover:scale-105"
                  onClick={closeMenu}
                >
                  Alerts
                </Link>
                <Link 
                  to="/notifications" 
                  className="block px-4 py-3 rounded-xl text-sm font-medium font-sleek text-primary-800 bg-primary-100/50 hover:bg-primary-100/70 backdrop-blur-sm border border-primary-200/40 hover:border-primary-200/60 transition-all duration-300 hover:shadow-md hover:scale-105"
                  onClick={closeMenu}
                >
                  Notifications
                </Link>
                <Link 
                  to="/profile" 
                  className="block px-4 py-3 rounded-xl text-sm font-medium font-sleek text-primary-800 bg-primary-100/50 hover:bg-primary-100/70 backdrop-blur-sm border border-primary-200/40 hover:border-primary-200/60 transition-all duration-300 hover:shadow-md hover:scale-105"
                  onClick={closeMenu}
                >
                  Profile
                </Link>
                <button 
                  onClick={() => {
                    logout();
                    closeMenu();
                  }} 
                  className="block px-4 py-3 rounded-xl text-sm font-semibold font-chic bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 transition-all duration-300 hover:shadow-lg hover:scale-105 border border-primary-500/20 text-left"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="block px-4 py-3 rounded-xl text-sm font-medium font-sleek text-primary-800 bg-primary-100/50 hover:bg-primary-100/70 backdrop-blur-sm border border-primary-200/40 hover:border-primary-200/60 transition-all duration-300 hover:shadow-md hover:scale-105"
                  onClick={closeMenu}
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="block px-4 py-3 rounded-xl text-sm font-semibold font-chic bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 transition-all duration-300 hover:shadow-lg hover:scale-105 border border-primary-500/20"
                  onClick={closeMenu}
                >
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};
