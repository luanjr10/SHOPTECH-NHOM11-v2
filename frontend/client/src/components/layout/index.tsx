import Footer from "./footer";
import Header from "./header";
import Main from "./main";
import { ChatWidget } from "../chat/ChatWidget";

function Layout() {
  return (
    <>
      <div className="layout">
        <Header />
        <Main />
        <Footer />
        <ChatWidget />
      </div>
    </>
  );
}

export default Layout;
