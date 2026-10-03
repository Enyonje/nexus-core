import AIPromptMetric from "../models/AIPromptMetric.js";

export async function promptPerformance(req, res) {
  const stats = await AIPromptMetric.aggregate([
    {
      $group: {
        _id: "$promptVersion",
        runs: { $sum: 1 },
        autoResolved: {
          $sum: { $cond: ["$autoResolved", 1, 0] }
        },
        avgConfidence: { $avg: "$confidence" }
      }
    }
  ]);

  res.json(stats);
}
