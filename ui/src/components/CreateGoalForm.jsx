// src/components/CreateGoalForm.jsx
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { goalSchemas } from "../lib/schemas/goals.js";
import { apiFetch } from "../lib/api.js";

export default function CreateGoalForm({ goalType }) {
  // Pick schema based on goalType
  const schema = goalSchemas[goalType];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (payload) => {
    try {
      const res = await apiFetch("/goals", {
        method: "POST",
        body: JSON.stringify({ goalType, payload }),
      });
      alert("Goal created: " + JSON.stringify(res));
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {goalType === "test" && (
        <div>
          <label>Message</label>
          <input {...register("message")} />
          {errors.message && <p>{errors.message.message}</p>}
        </div>
      )}

      {goalType === "http_request" && (
        <>
          <label>URL</label>
          <input {...register("url")} />
          {errors.url && <p>{errors.url.message}</p>}

          <label>Method</label>
          <select {...register("method")}>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </>
      )}

      {/* Add conditional fields for other goal types here */}

      <button type="submit">Create Goal</button>
    </form>
  );
}