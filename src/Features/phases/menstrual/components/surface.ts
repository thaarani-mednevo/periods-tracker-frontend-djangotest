/** Card surfaces for the menstrual overview (shared by every card on the page). */
export const surface = {
  /** Primary white card: large radius, hairline neutral border, soft shadow. */
  card: "bg-white rounded-[22px] border border-[#F1EEF3] shadow-[0_8px_28px_rgba(23,21,43,0.045)]",
  /** Nested card inside a grouped section. */
  inner: "bg-white rounded-[18px] border border-[#EEEDF2] shadow-[0_2px_10px_rgba(23,21,43,0.035)]",
  /** Metric card with the soft pink halo border. */
  halo: "bg-white rounded-[22px] border border-[#FBE3EE] ring-[6px] ring-[#FFF4F9] shadow-[0_6px_22px_rgba(236,72,153,0.06)]",
} as const;