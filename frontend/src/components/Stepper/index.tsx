import { IconCheck } from "@tabler/icons-react";
import styles from "./Stepper.module.css";

interface Step {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

interface StepperProps {
  steps: Step[];
  currentStep: number; // 0-indexed
  vertical?: boolean;
}

export function Stepper({
  steps,
  currentStep,
  vertical = false,
}: StepperProps) {
  return (
    <div
      className={[styles.stepper, vertical && styles.stepperVertical]
        .filter(Boolean)
        .join(" ")}
    >
      {steps.map((step, index) => {
        const StepIcon = step.icon;
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;

        const stepClassName = [
          styles.step,
          isActive && styles.stepActive,
          isCompleted && styles.stepCompleted,
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <div key={index} className={stepClassName}>
            <span className={styles.stepNumber}>
              {isCompleted ? <IconCheck size={14} /> : index + 1}
            </span>
            <StepIcon size={16} />
            <span className={styles.stepLabel}>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}
