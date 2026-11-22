export const motionTokens = {
  spring: { type: 'spring', stiffness: 360, damping: 31, mass: 0.75 },
  press: { scale: 0.975 },
  reveal: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
  stagger: 0.045,
  tilt: 2,
  lift: 3,
  magnet: 4,
  parallax: 12,
} as const
