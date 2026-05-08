import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";

import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import AddJob from "./pages/AddJob";
import EditJob from "./pages/EditJob";

import jobsData from "./data/jobs";

function App() {
  const [jobs, setJobs] = useState(() => {
    const savedJobs = localStorage.getItem("jobs");

    return savedJobs
      ? JSON.parse(savedJobs)
      : jobsData;
  });

  useEffect(() => {
    localStorage.setItem(
      "jobs",
      JSON.stringify(jobs)
    );
  }, [jobs]);

  const addJob = (newJob) => {
    setJobs([...jobs, newJob]);
  };

  const deleteJob = (id) => {
    const updatedJobs = jobs.filter(
      (job) => job.id !== id
    );

    setJobs(updatedJobs);
  };

  const updateJob = (updatedJob) => {
    const updatedJobs = jobs.map((job) =>
      job.id === updatedJob.id
        ? updatedJob
        : job
    );

    setJobs(updatedJobs);
  };

  return (
    <BrowserRouter>
      <Navbar />

      <div className="max-w-6xl mx-auto p-4">
        <Routes>
          <Route
            path="/"
            element={
              <Home
                jobs={jobs}
                onDelete={deleteJob}
              />
            }
          />

          <Route
            path="/add-job"
            element={
              <AddJob onAddJob={addJob} />
            }
          />

          <Route
            path="/edit-job/:id"
            element={
              <EditJob
                jobs={jobs}
                onUpdateJob={updateJob}
              />
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;