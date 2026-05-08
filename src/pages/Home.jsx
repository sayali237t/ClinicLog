import JobCard from "../components/JobCard";

function Home({ jobs, onDelete }) {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        Available Jobs
      </h1>

      {jobs.length === 0 ? (
        <div className="bg-white p-6 rounded-xl shadow-md text-center">
          <p className="text-lg font-medium">
            No jobs available
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Home;