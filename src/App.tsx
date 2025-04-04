
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";

import { NavBar } from "@/components/NavBar";
import HomePage from "./pages/HomePage";
import ShowBookingPage from "./pages/ShowBookingPage";
import CartPage from "./pages/CartPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import BookingsPage from "./pages/BookingsPage";
import AdminShowsPage from "./pages/admin/AdminShowsPage";
import AdminReportsPage from "./pages/admin/AdminReportsPage";
import AdminLogsPage from "./pages/admin/AdminLogsPage";
import NotFoundPage from "./pages/NotFoundPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="min-h-screen flex flex-col bg-background">
              <NavBar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/shows/:showId/booking/:showTimeId" element={<ShowBookingPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/bookings" element={<BookingsPage />} />
                  <Route path="/admin/shows" element={<AdminShowsPage />} />
                  <Route path="/admin/reports" element={<AdminReportsPage />} />
                  <Route path="/admin/logs" element={<AdminLogsPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </main>
              <footer className="bg-card py-6 mt-auto">
                <div className="container text-center text-sm text-muted-foreground">
                  <p>Cineverse Theatre Booking System &copy; {new Date().getFullYear()}</p>
                  <p className="mt-1">An offline theatre booking application</p>
                </div>
              </footer>
            </div>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
