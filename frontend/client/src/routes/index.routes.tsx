import Home from "../pages/home";
import Layout from "../components/layout/index";
import Login from "../pages/login";
import Register from "../pages/register";
import ForgotPassword from "../pages/forgot-password";
import SellerRegister from "../pages/seller-register";
import StorePage from "../pages/store";
import StoresPage from "../pages/stores";
import CategoryPage from "../pages/category";
import ProductDetailPage from "../pages/product-detail";
import SearchPage from "../pages/search";
import RequireAuth from "../components/auth/RequireAuth";
import AccountLayout from "../pages/account/AccountLayout";
import ProfileTab from "../pages/account/ProfileTab";
import AddressesTab from "../pages/account/AddressesTab";
import ChangePasswordTab from "../pages/account/ChangePasswordTab";
import SessionsTab from "../pages/account/SessionsTab";
import OrdersTab from "../pages/account/OrdersTab";
import OrderDetailTab from "../pages/account/OrderDetailTab";
import VouchersTab from "../pages/account/VouchersTab";
import AffiliateTab from "../pages/account/AffiliateTab";
import AffiliatePage from "../pages/affiliate";
import WishlistTab from "../pages/account/WishlistTab";
import XuTab from "../pages/account/XuTab";
import InstallmentsTab from "../pages/account/InstallmentsTab";
import ComparePage from "../pages/compare";
import TradeInPage from "../pages/trade-in";
import MessagesTab from "../pages/account/MessagesTab";
import CartPage from "../pages/cart";
import CheckoutPage from "../pages/checkout";
import OrderSuccessPage from "../pages/order-success";
import PaymentResultPage from "../pages/payment-result";

export const allRoutes = [
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "/danh-muc/:slug",
        element: <CategoryPage />,
      },
      {
        path: "/san-pham/:slug",
        element: <ProductDetailPage />,
      },
      {
        path: "/tim-kiem",
        element: <SearchPage />,
      },
      {
        path: "/so-sanh",
        element: <ComparePage />,
      },
      {
        path: "/thu-cu-doi-moi",
        element: <TradeInPage />,
      },
      {
        path: "/dang-ky-ban-hang",
        element: <SellerRegister />,
      },
      {
        path: "/affiliate",
        element: <AffiliatePage />,
      },
      {
        path: "/gian-hang",
        element: <StoresPage />,
      },
      {
        path: "/gian-hang/:slug",
        element: <StorePage />,
      },
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/register",
        element: <Register />,
      },
      {
        path: "/forgot-password",
        element: <ForgotPassword />,
      },
      {
        element: <RequireAuth />,
        children: [
          {
            path: "/tai-khoan",
            element: <AccountLayout />,
            children: [
              { index: true, element: <ProfileTab /> },
              { path: "don-hang", element: <OrdersTab /> },
              { path: "don-hang/:id", element: <OrderDetailTab /> },
              { path: "uu-dai", element: <VouchersTab /> },
              { path: "gioi-thieu", element: <AffiliateTab /> },
              { path: "yeu-thich", element: <WishlistTab /> },
              { path: "xu", element: <XuTab /> },
              { path: "tra-gop", element: <InstallmentsTab /> },
              { path: "tin-nhan", element: <MessagesTab /> },
              { path: "dia-chi", element: <AddressesTab /> },
              { path: "doi-mat-khau", element: <ChangePasswordTab /> },
              { path: "phien-dang-nhap", element: <SessionsTab /> },
            ],
          },
          { path: "/gio-hang", element: <CartPage /> },
          { path: "/thanh-toan", element: <CheckoutPage /> },
          { path: "/dat-hang-thanh-cong", element: <OrderSuccessPage /> },
          { path: "/thanh-toan/ket-qua", element: <PaymentResultPage /> },
        ],
      },
    ],
  },
];
