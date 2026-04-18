import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppNav from "./components/AppNav";
import ScrapePage from "./pages/ScrapePage";
import DashboardPage from "./pages/DashboardPage";
import HistoryPage from "./pages/HistoryPage";
import SignalHistoryPage from "./pages/SignalHistoryPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen gradient-mesh">
          <AppNav />
          <Routes>
            <Route path="/" element={<Navigate to="/scrape" replace />} />
            <Route path="/scrape" element={<ScrapePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/history" element={<SignalHistoryPage />} />
            <Route path="/signals" element={<SignalHistoryPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
