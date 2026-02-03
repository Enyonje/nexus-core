// src/components/DynamicGoalForm.jsx
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { goalSchemas } from "../lib/schemas/goals.js";
import { apiFetch } from "../lib/api.js";

export default function DynamicGoalForm({ goalType }) {
  const schema = goalSchemas[goalType];
  if (!schema) {
    return <p>Unsupported goal type: {goalType}</p>;
  }

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

  // Dynamically render fields based on schema shape
  const fields = Object.keys(schema.shape);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {fields.map((field) => (
        <div key={field}>
          <label>{field}</label>
          <input {...register(field)} />
          {errors[field] && <p>{errors[field].message}</p>}
        </div>
      ))}

      <button type="submit">Create Goal</button>
    </form>
  );
}