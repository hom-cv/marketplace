/**
 * Measurements Diagram Component
 * SVG diagrams showing measurement locations for different clothing types
 */

import { Box } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { PostType, Measurements } from "@/api/types/post";
import styles from "./MeasurementsDiagram.module.css";

interface MeasurementsDiagramProps {
  type: PostType;
  measurements?: Measurements;
}

export function MeasurementsDiagram({ type, measurements }: MeasurementsDiagramProps) {
  const { t } = useTranslation("listings");

  const getMeasurementValue = (key: string): string => {
    const value = (measurements as Record<string, number | undefined>)?.[key];
    return value !== undefined ? `${value}` : "";
  };

  const ArrowMarker = ({ id, color }: { id: string; color: string }) => (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX="5"
      refY="5"
      markerWidth="6"
      markerHeight="6"
      orient="auto-start-reverse"
    >
      <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
    </marker>
  );

  // Top/Shirt - Technical Flat Sketch
  const TopDiagram = () => (
    <svg viewBox="0 0 300 300" className={styles.diagram}>
      <defs>
        <ArrowMarker id="arrowBlue" color="#228be6" />
        <ArrowMarker id="arrowGreen" color="#40c057" />
        <ArrowMarker id="arrowOrange" color="#fab005" />
        <ArrowMarker id="arrowPurple" color="#be4bdb" />
      </defs>

      {/* Shirt Outline */}
      <path
        d="M 100 40 
           Q 150 55 200 40 
           L 200 65 
           Q 215 60 230 70 
           L 255 90 
           L 235 110 
           Q 220 100 200 105 
           L 200 250 
           Q 150 255 100 250 
           L 100 105 
           Q 80 100 65 110 
           L 45 90 
           L 70 70 
           Q 85 60 100 65 Z"
        fill="#ffffff"
        stroke="#343a40"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Neck Detail */}
      <path d="M 100 40 Q 150 75 200 40" fill="none" stroke="#343a40" strokeWidth="1.5" />
      <path d="M 100 40 Q 150 65 200 40" fill="none" stroke="#e9ecef" strokeWidth="1" strokeDasharray="2" />

      {/* Armhole Seams */}
      <path d="M 100 65 Q 98 85 100 105" fill="none" stroke="#ced4da" strokeWidth="1" />
      <path d="M 200 65 Q 202 85 200 105" fill="none" stroke="#ced4da" strokeWidth="1" />

      {/* SLEEVE - Purple */}
      {/* Line along the sleeve length */}
      <line x1="68" y1="72" x2="43" y2="92" stroke="#be4bdb" strokeWidth="2" />
      <text x="35" y="65" className={styles.labelPurple} style={{ fontSize: "10px" }}>
        {t("measurements.sleeve")} {getMeasurementValue("sleeve") && `(${getMeasurementValue("sleeve")})`}
      </text>

      {/* SHOULDER - Blue */}
      <line x1="100" y1="30" x2="200" y2="30" stroke="#228be6" strokeWidth="2" markerStart="url(#arrowBlue)" markerEnd="url(#arrowBlue)" />
      <text x="150" y="25" textAnchor="middle" className={styles.labelBlue} style={{ fontSize: "11px", fontWeight: 600 }}>
        {t("measurements.shoulder")} {getMeasurementValue("shoulder") && `(${getMeasurementValue("shoulder")})`}
      </text>

      {/* BUST - Orange */}
      <line x1="100" y1="120" x2="200" y2="120" stroke="#fab005" strokeWidth="2" strokeDasharray="4" markerStart="url(#arrowOrange)" markerEnd="url(#arrowOrange)" />
      <text x="150" y="135" textAnchor="middle" className={styles.labelOrange} style={{ fontSize: "11px", fontWeight: 600 }}>
        {t("measurements.bust")} {getMeasurementValue("bust") && `(${getMeasurementValue("bust")})`}
      </text>

      {/* LENGTH - Green */}
      <line x1="220" y1="40" x2="220" y2="250" stroke="#40c057" strokeWidth="2" markerStart="url(#arrowGreen)" markerEnd="url(#arrowGreen)" />
      {/* Dotted extension lines for length */}
      <line x1="205" y1="40" x2="225" y2="40" stroke="#ced4da" strokeWidth="1" strokeDasharray="2" />
      <line x1="205" y1="250" x2="225" y2="250" stroke="#ced4da" strokeWidth="1" strokeDasharray="2" />
      <text x="235" y="145" className={styles.labelGreen} style={{ writingMode: "vertical-rl", fontSize: "11px", fontWeight: 600 }}>
        {t("measurements.length")} {getMeasurementValue("length") && `(${getMeasurementValue("length")})`}
      </text>
    </svg>
  );

  // Pants - Technical Flat Sketch
  const PantsDiagram = () => (
    <svg viewBox="0 0 300 350" className={styles.diagram}>
      <defs>
        <ArrowMarker id="arrowBlue" color="#228be6" />
        <ArrowMarker id="arrowGreen" color="#40c057" />
        <ArrowMarker id="arrowOrange" color="#fab005" />
        <ArrowMarker id="arrowPurple" color="#be4bdb" />
      </defs>

      {/* Pants Outline */}
      <path
        d="M 80 40 
           L 220 40 
           Q 225 100 230 110 
           L 210 320 
           L 155 320 
           L 150 120 
           L 145 320 
           L 90 320 
           L 70 110 
           Q 75 100 80 40 Z"
        fill="#ffffff"
        stroke="#343a40"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Waistband */}
      <path d="M 80 60 L 220 60" fill="none" stroke="#343a40" strokeWidth="1" />
      {/* Fly */}
      <path d="M 150 120 Q 140 90 150 60" fill="none" stroke="#343a40" strokeWidth="1" />

      {/* HIP - Blue */}
      <line x1="80" y1="90" x2="220" y2="90" stroke="#228be6" strokeWidth="2" strokeDasharray="4" markerStart="url(#arrowBlue)" markerEnd="url(#arrowBlue)" />
      <text x="150" y="85" textAnchor="middle" className={styles.labelBlue} style={{ fontSize: "11px", fontWeight: 600 }}>
        {t("measurements.hip")} {getMeasurementValue("hip") && `(${getMeasurementValue("hip")})`}
      </text>

      {/* RISE - Green */}
      <line x1="50" y1="40" x2="50" y2="120" stroke="#40c057" strokeWidth="2" markerStart="url(#arrowGreen)" markerEnd="url(#arrowGreen)" />
      {/* Extension lines for rise */}
      <line x1="50" y1="40" x2="75" y2="40" stroke="#ced4da" strokeWidth="1" strokeDasharray="2" />
      <line x1="50" y1="120" x2="140" y2="120" stroke="#ced4da" strokeWidth="1" strokeDasharray="2" />
      <text x="45" y="80" textAnchor="end" className={styles.labelGreen} style={{ fontSize: "11px", fontWeight: 600 }}>
        {t("measurements.rise")}
      </text>

      {/* INSEAM - Orange */}
      <line x1="145" y1="130" x2="140" y2="310" stroke="#fab005" strokeWidth="2" strokeDasharray="4" markerStart="url(#arrowOrange)" markerEnd="url(#arrowOrange)" />
      <text x="135" y="220" textAnchor="end" className={styles.labelOrange} style={{ fontSize: "11px", fontWeight: 600 }}>
        {t("measurements.inseam")} {getMeasurementValue("inseam") && `(${getMeasurementValue("inseam")})`}
      </text>

      {/* TOTAL LENGTH - Purple */}
      <line x1="250" y1="40" x2="240" y2="320" stroke="#be4bdb" strokeWidth="2" markerStart="url(#arrowPurple)" markerEnd="url(#arrowPurple)" />
      {/* Extension lines for length */}
      <line x1="225" y1="40" x2="255" y2="40" stroke="#ced4da" strokeWidth="1" strokeDasharray="2" />
      <line x1="215" y1="320" x2="245" y2="320" stroke="#ced4da" strokeWidth="1" strokeDasharray="2" />
      <text x="260" y="180" className={styles.labelPurple} style={{ writingMode: "vertical-rl", fontSize: "11px", fontWeight: 600 }}>
        {t("measurements.totalLength")} {getMeasurementValue("total_length") && `(${getMeasurementValue("total_length")})`}
      </text>
    </svg>
  );

  // Shoe - Technical Side Profile
  const ShoesDiagram = () => (
    <svg viewBox="0 0 300 150" className={styles.diagram}>
      <defs>
        <ArrowMarker id="arrowBlue" color="#228be6" />
      </defs>

      {/* Shoe Outline */}
      <path
        d="M 40 90 
           Q 40 70 55 60 
           Q 70 50 110 45 
           L 150 45 
           Q 180 45 200 55 
           L 240 65 
           Q 270 70 270 90 
           Q 270 110 260 115 
           L 260 120 
           L 40 120 
           Q 30 120 30 100 
           Q 30 90 40 90 Z"
        fill="#ffffff"
        stroke="#343a40"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Sole & Details */}
      <path d="M 32 105 L 268 105" fill="none" stroke="#343a40" strokeWidth="1" />
      <path d="M 80 80 Q 120 65 170 80" fill="none" stroke="#e9ecef" strokeWidth="1" />
      <ellipse cx="160" cy="55" rx="35" ry="8" fill="none" stroke="#ced4da" strokeWidth="1" />

      {/* INSOLE LENGTH - Blue */}
      <line x1="40" y1="135" x2="260" y2="135" stroke="#228be6" strokeWidth="2" markerStart="url(#arrowBlue)" markerEnd="url(#arrowBlue)" />
      {/* Extension lines */}
      <line x1="40" y1="120" x2="40" y2="140" stroke="#ced4da" strokeWidth="1" strokeDasharray="2" />
      <line x1="260" y1="120" x2="260" y2="140" stroke="#ced4da" strokeWidth="1" strokeDasharray="2" />

      <text x="150" y="148" textAnchor="middle" className={styles.labelBlueLarge} style={{ fontSize: "11px", fontWeight: 600 }}>
        {t("measurements.insoleLength")} {getMeasurementValue("insole_length") && `(${getMeasurementValue("insole_length")})`}
      </text>
    </svg>
  );

  const getDiagram = () => {
    switch (type) {
      case "SHIRT":
      case "JACKET":
      case "OTHER":
        return <TopDiagram />;
      case "PANTS":
        return <PantsDiagram />;
      case "SHOES":
        return <ShoesDiagram />;
      case "ACCESSORIES":
        return null;
      default:
        return null;
    }
  };

  const diagram = getDiagram();
  if (!diagram) return null;

  return (
    <Box className={styles.container}>
      {diagram}
    </Box>
  );
}
