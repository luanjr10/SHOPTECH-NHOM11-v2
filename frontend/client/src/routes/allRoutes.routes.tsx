import { useRoutes } from "react-router-dom";
import { allRoutes } from "./index.routes";

function AllRoutes() {
  const routes = useRoutes(allRoutes);
  return <>{routes}</>;
}

export default AllRoutes;
