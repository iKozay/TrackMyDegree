import React, { useMemo } from "react";
import { Zap, Calendar, BookOpen, AlertCircle, CheckCircle } from "lucide-react";
import { optimizePath } from "../utils/graduationOptimizer";
import type { TimelineState } from "../types/timeline.types";

interface OptimizerModalProps {
  state: TimelineState;
  onApply: () => void;
  onClose: () => void;
}
