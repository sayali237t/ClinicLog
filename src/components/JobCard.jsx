import { Link } from "react-router-dom";

function JobCard({ job, onDelete }) {
  const handleApply = () => {
    alert("Application Submitted!");
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-md hover:shadow-lg transition">
      <h2 className="text-2xl font-bold mb-2">{job.title}</h2>

      <p className="mb-1">
        <span className="font-semibold">Industry:</span> {job.industry}
      </p>

      <p className="mb-1">
        <span className="font-semibold">Payscale:</span> {job.payscale}
      </p>

      <p className="mb-1">
        <span className="font-semibold">Experience:</span>{" "}
        {job.experience} Years
      </p>

      <p className="mb-4">
        <span className="font-semibold">Joining Date:</span>{" "}
        {job.joiningDate}
      </p>

      <div className="flex gap-2">
        <button
          onClick={handleApply}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
        >
          Apply
        </button>

        <Link
          to={`/edit-job/${job.id}`}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Edit
        </Link>

        <button
          onClick={() => onDelete(job.id)}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default JobCard;