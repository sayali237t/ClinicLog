import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="bg-indigo-600 text-white p-4 shadow-md">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">
          Job Portal
        </Link>

        <Link
          to="/add-job"
          className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium"
        >
          Add Job
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;