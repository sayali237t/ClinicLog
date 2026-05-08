import { useState } from "react";

function JobForm({ onSubmit, initialData = {} }) {
  const [title, setTitle] = useState(initialData.title || "");
  const [industry, setIndustry] = useState(initialData.industry || "");
  const [payscale, setPayscale] = useState(initialData.payscale || "");
  const [experience, setExperience] = useState(
    initialData.experience || ""
  );
  const [joiningDate, setJoiningDate] = useState(
    initialData.joiningDate || ""
  );

  const handleSubmit = (e) => {
    e.preventDefault();

    const newJob = {
      id: initialData.id || Date.now(),
      title,
      industry,
      payscale,
      experience,
      joiningDate,
    };

    onSubmit(newJob);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-xl shadow-md"
    >
      <div className="mb-4">
        <label className="block mb-1 font-medium">
          Job Title
        </label>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border p-2 rounded-lg"
          required
        />
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-medium">
          Industry
        </label>

        <input
          type="text"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="w-full border p-2 rounded-lg"
          required
        />
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-medium">
          Payscale
        </label>

        <input
          type="text"
          value={payscale}
          onChange={(e) => setPayscale(e.target.value)}
          className="w-full border p-2 rounded-lg"
          required
        />
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-medium">
          Experience Required
        </label>

        <input
          type="number"
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          className="w-full border p-2 rounded-lg"
          required
        />
      </div>

      <div className="mb-6">
        <label className="block mb-1 font-medium">
          Joining Date
        </label>

        <input
          type="date"
          value={joiningDate}
          onChange={(e) => setJoiningDate(e.target.value)}
          className="w-full border p-2 rounded-lg"
          required
        />
      </div>

      <button
        type="submit"
        className="bg-blue-600 text-white px-5 py-2 rounded-lg"
      >
        Save Job
      </button>
    </form>
  );
}

export default JobForm;