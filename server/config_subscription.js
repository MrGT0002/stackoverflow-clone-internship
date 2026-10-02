export const SUBSCRIPTION_PLANS = {
  free: {
    key: "free",
    name: "Free",
    price: 0,
    currency: "INR",
    dailyQuestionLimit: 1,
    badge: "Free",
    features: ["1 question per day", "Basic search"],
  },
  bronze: {
    key: "bronze",
    name: "Bronze",
    price: 99,
    currency: "INR",
    dailyQuestionLimit: 5,
    badge: "Bronze",
    features: ["5 questions per day", "Bronze badge", "Advanced search filters"],
  },
  silver: {
    key: "silver",
    name: "Silver",
    price: 299,
    currency: "INR",
    dailyQuestionLimit: 15,
    badge: "Silver",
    features: ["15 questions per day", "Silver badge", "Priority support", "Enhanced profile visibility", "Unlimited bookmarks"],
  },
  gold: {
    key: "gold",
    name: "Gold",
    price: 999,
    currency: "INR",
    dailyQuestionLimit: null,
    badge: "Gold",
    features: ["Unlimited questions", "Gold badge", "Highest search priority", "Featured profile visibility", "Priority customer support", "Exclusive community"],
  },
};

export const PAID_PLAN_KEYS = ["bronze", "silver", "gold"];

export const getPlan = (planKey) => SUBSCRIPTION_PLANS[planKey] || null;
