import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.tsx";
import { CartProvider } from "./context/CartContext.tsx";
import { LocationProvider } from "./context/LocationContext.tsx";
import { WishlistProvider } from "./context/WishlistContext.tsx";
import { CompareProvider } from "./context/CompareContext.tsx";
import { captureAffiliateFromUrl } from "./libs/referral.ts";

captureAffiliateFromUrl();

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <CartProvider>
        <LocationProvider>
          <WishlistProvider>
            <CompareProvider>
              <App />
            </CompareProvider>
          </WishlistProvider>
        </LocationProvider>
      </CartProvider>
    </AuthProvider>
  </BrowserRouter>,
);
