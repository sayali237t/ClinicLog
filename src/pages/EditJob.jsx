import { useParams, useNavigate } from "react-router-dom";
import JobForm from "../components/JobForm";

function EditJob({ jobs, onUpdateJob }) {
  const { id } = useParams();

  const navigate = useNavigate();

  const selectedJob = jobs.find(
    (job) => job.id === Number(id)
  );

  const handleUpdateJob = (updatedJob) => {
    onUpdateJob(updatedJob);

    navigate("/");
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        Edit Job
      </h1>

      <JobForm
        onSubmit={handleUpdateJob}
        initialData={selectedJob}
      />
    </div>
  );
}

export default EditJob;