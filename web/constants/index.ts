export const BRAND = {
  name: "Only Fit",
  tagline: "Lift. Track. Dominate.",
  description:
    "The modern fitness app for tracking workouts, supersets, rest timers, and personal records. Built for everyone from beginners to advanced athletes.",
};

export const COLORS = {
  primary: "#FF6B35",
  accent: "#10B981",
  warning: "#F59E0B",
  dark: "#2D2D2D",
  light: "#F7F7F7",
  white: "#FFFFFF",
};

export const NAV_ITEMS = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Dashboard", href: "/dashboard" },
];

export const DASHBOARD_NAV = [
  { label: "Overview", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "History", href: "/dashboard/history", icon: "History" },
  { label: "Analytics", href: "/dashboard/analytics", icon: "BarChart3" },
  { label: "Measurements", href: "/dashboard/measurements", icon: "Ruler" },
  { label: "Goals", href: "/dashboard/goals", icon: "Target" },
] as const;

export const FEATURES = [
  {
    title: "Live Workout Logging",
    description:
      "Log sets, reps, and weight in real-time. Support for supersets, dropsets, and smart rest timers that keep you on pace.",
    items: [
      "Supersets & Dropsets",
      "Configurable Rest Timers",
      "Clean Set Input",
      "Session Notes",
    ],
  },
  {
    title: "Exercise Library",
    description:
      "Browse hundreds of exercises or create your own. Filter by muscle group, equipment, and category to find exactly what you need.",
    items: [
      "Custom Exercises",
      "Muscle-based Filtering",
      "Equipment Filters",
      "Pinned Notes",
    ],
  },
  {
    title: "Smart Analytics",
    description:
      "Track your progress with personal records, volume charts, and exercise history. See exactly how far you've come.",
    items: [
      "PR Tracking",
      "Volume Charts",
      "Exercise History",
      "Performance Trends",
    ],
  },
  {
    title: "Built for Everyone",
    description:
      "Whether you're just starting out or chasing competition PRs, Only Fit adapts to your level and your goals.",
    items: [
      "Beginner Friendly",
      "Intermediate Tracking",
      "Advanced Programming",
      "Goal Setting",
    ],
  },
];

export const PRICING_PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Everything you need to start tracking your workouts.",
    features: [
      { text: "Unlimited workouts", included: true },
      { text: "Exercise library", included: true },
      { text: "Basic stats", included: true },
      { text: "Rest timers", included: true },
      { text: "Session notes", included: true },
      { text: "3 workout templates", included: true },
      { text: "Advanced analytics", included: false },
      { text: "Goal tracking", included: false },
      { text: "Body measurements", included: false },
      { text: "Custom themes", included: false },
    ],
    highlighted: false,
    cta: "Get Started Free",
  },
  {
    name: "PRO",
    price: "$4.99",
    period: "/month",
    description: "Unlock your full potential with advanced features.",
    features: [
      { text: "Unlimited workouts", included: true },
      { text: "Exercise library", included: true },
      { text: "Basic stats", included: true },
      { text: "Rest timers", included: true },
      { text: "Session notes", included: true },
      { text: "Unlimited templates", included: true },
      { text: "Advanced analytics", included: true },
      { text: "Goal tracking", included: true },
      { text: "Body measurements", included: true },
      { text: "Custom themes", included: true },
    ],
    highlighted: true,
    cta: "Start PRO Trial",
  },
];

export const TESTIMONIALS = [
  {
    name: "Alex R.",
    role: "Powerlifter",
    text: "Finally an app that handles supersets properly. I switched from three other apps before finding Only Fit.",
    rating: 5,
  },
  {
    name: "Maria K.",
    role: "Fitness Enthusiast",
    text: "Clean, fast, and does exactly what I need. The rest timer integration is perfect for my HIIT sessions.",
    rating: 5,
  },
  {
    name: "James T.",
    role: "Personal Trainer",
    text: "I recommend Only Fit to all my clients. The workout logging is intuitive and the analytics help them see real progress.",
    rating: 5,
  },
];

export const STATS = [
  { value: "10,000+", label: "Workouts Logged" },
  { value: "500+", label: "Active Users" },
  { value: "4.8", label: "App Store Rating" },
  { value: "50K+", label: "Sets Tracked" },
];
