import Footer from "./footer";
import Header from "./header";
import Main from "./main";
import { ChatWidget } from "../chat/ChatWidget";
import { CompareTray } from "../compare/CompareTray";

function Layout() {
  return (
    <>
      <div className="layout">
        <Header />
        <Main />
        <Footer />
        <ChatWidget />
        <CompareTray />
      </div>
    </>
  );
}

export default Layout;
