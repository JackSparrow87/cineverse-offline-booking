
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCartContext } from "@/contexts/CartContext";
import { ShoppingCart, User, LogOut } from "lucide-react";
import { Link } from "react-router-dom";

export function NavBar() {
  const { currentUser, isAdmin, logout } = useAuthContext();
  const { getItemCount } = useCartContext();
  
  return (
    <nav className="bg-card shadow-md py-4">
      <div className="container flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="text-2xl font-bold text-secondary">
            Cineverse
          </Link>
          {currentUser && (
            <div className="ml-8 hidden md:flex space-x-6">
              <Link to="/" className="text-foreground hover:text-secondary transition-colors">
                Shows
              </Link>
              {isAdmin ? (
                <>
                  <Link to="/admin/shows" className="text-foreground hover:text-secondary transition-colors">
                    Manage Shows
                  </Link>
                  <Link to="/admin/reports" className="text-foreground hover:text-secondary transition-colors">
                    Sales Reports
                  </Link>
                  <Link to="/admin/logs" className="text-foreground hover:text-secondary transition-colors">
                    System Logs
                  </Link>
                </>
              ) : (
                <Link to="/bookings" className="text-foreground hover:text-secondary transition-colors">
                  My Bookings
                </Link>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {currentUser ? (
            <>
              {!isAdmin && (
                <Link to="/cart">
                  <Button variant="ghost" className="relative">
                    <ShoppingCart className="h-5 w-5" />
                    {getItemCount() > 0 && (
                      <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                        {getItemCount()}
                      </span>
                    )}
                  </Button>
                </Link>
              )}
              <div className="hidden md:flex items-center text-sm">
                <User className="h-4 w-4 mr-1" />
                <span>{currentUser.username}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={logout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="outline">Login</Button>
              </Link>
              <Link to="/register">
                <Button>Register</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
