import EmployeeList from "../components/employee/EmployeeList";

function ManageEmployeePage() {
  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <h2 className="text-2xl text-white font-bold font-sans">
        Quản Lý Nhân Viên
      </h2>
      <EmployeeList />
    </div>
  );
}

export default ManageEmployeePage;
