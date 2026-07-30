/**
 * OrderProgressRail - Horizontal step rail.
 * Shared by the Purchases and Sold Listings cards and Checkout.
 */

import { Fragment } from "react";
import { IconCheck } from "@tabler/icons-react";
import styles from "./OrderProgressRail.module.css";

interface Step {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
}

interface OrderProgressRailProps {
  steps: Step[];
  /** 0-indexed active step; steps below it render as done, at/above as upcoming. */
  currentStep: number;
}

export function OrderProgressRail({ steps, currentStep }: OrderProgressRailProps) {
  return (
    <div className={styles.rail}>
      {steps.map((step, i) => {
        const StepIcon = step.icon;
        const done = i < currentStep;
        const active = i === currentStep;
        const nodeClass = [
          styles.node,
          done && styles.nodeDone,
          active && styles.nodeActive,
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <Fragment key={i}>
            {i > 0 && (
              <div
                className={`${styles.connector} ${
                  i <= currentStep ? styles.connectorDone : ""
                }`}
              />
            )}
            <div className={nodeClass}>
              <span className={styles.dot}>
                {done ? <IconCheck size={15} /> : <StepIcon size={15} />}
              </span>
              <span className={styles.nodeLabel}>{step.label}</span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
