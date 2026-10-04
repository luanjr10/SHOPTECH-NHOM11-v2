import Home from "../pages/home";
import Layout from "../components/layout/index";
import Login from "../pages/login";
import Register from "../pages/register";
import ForgotPassword from "../pages/forgot-password";
import SellerRegister from "../pages/seller-register";
import StorePage from "../pages/store";
import StoresPage from "../pages/stores";
import RequireAuth from "../components/auth/RequireAuth";
import AccountLayout from "../pages/account/AccountLayout";
import ProfileTab from "../pages/account/ProfileTab";
import AddressesTab from "../pages/account/AddressesTab";
import ChangePasswordTab from "../pages/account/ChangePasswordTab";
import SessionsTab from "../pages/account/SessionsTab";
import OrdersTab from "../pages/account/OrdersTab";
import OrderDetailTab from "../pages/account/OrderDetailTab";
import VouchersTab from "../pages/account/VouchersTab";
import CartPage from "../pages/cart";

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
        path: "/dang-ky-ban-hang",
        element: <SellerRegister />,
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
              { path: "dia-chi", element: <AddressesTab /> },
              { path: "doi-mat-khau", element: <ChangePasswordTab /> },
              { path: "phien-dang-nhap", element: <SessionsTab /> },
            ],
          },
          { path: "/gio-hang", element: <CartPage /> },
        ],
      },
    ],
  },
];
