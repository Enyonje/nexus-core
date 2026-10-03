export const tierLimits = {
  free: {
    maxGoals: 5,
    maxExecutionsPerDay: 3,
  },
  pro: {
    maxGoals: 50,
    maxExecutionsPerDay: 50,
  },
  enterprise: {
    maxGoals: Infinity,
    maxExecutionsPerDay: Infinity,
  },
};