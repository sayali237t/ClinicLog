import { useNavigate } from "react-router-dom";
import JobForm from "../components/JobForm";

function AddJob({ onAddJob }) {
  const navigate = useNavigate();

  const handleAddJob = (job) => {
    onAddJob(job);

    navigate("/");
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        Add New Job
      </h1>

      <JobForm onSubmit={handleAddJob} />
    </div>
  );
}

export default AddJob;