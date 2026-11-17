/** Exact critically damped response. Input remains native browser scroll. */
export class SmoothProgress {
  value = 0;
  velocity = 0;
  target = 0;
  frequency: number;
  constructor(frequency = 14) {
    this.frequency = frequency;
  }
  reset(value: number) {
    this.value = this.target = value;
    this.velocity = 0;
  }
  step(seconds: number) {
    const offset = this.value - this.target;
    if (Math.abs(offset) < 0.00001 && Math.abs(this.velocity) < 0.0001) {
      this.value = this.target;
      this.velocity = 0;
      return this.value;
    }
    const dt = Math.max(0, Math.min(seconds, 0.05));
    const decay = Math.exp(-this.frequency * dt);
    const impulse = (this.velocity + this.frequency * offset) * dt;
    const next = this.target + (offset + impulse) * decay;
    this.velocity = (this.velocity - this.frequency * impulse) * decay;
    // Reversing close to a destination must never carry us past it.
    if ((next - this.target) * offset < 0) {
      this.value = this.target;
      this.velocity = 0;
    } else this.value = Math.max(0, Math.min(1, next));
    return this.value;
  }
}

/** Zero velocity AND acceleration at the ends of a reading hold. */
export const smoothStep = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
};
