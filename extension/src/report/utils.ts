/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2023 by
 * + Kiel University
 *   + Department of Computer Science
 *     + Real-Time and Embedded Systems Group
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 */

/**
 * The Headers for the STPA result file.
 */
export class Headers {
    static Goal = "Goal";
    static Assumption = "Assumptions";
    static Loss = "Losses";
    static Hazard = "Hazards";
    static SystemLevelConstraint = "System-level Constraints";
    static Responsibility = "Responsibilities";
    static ControlStructure = "Control Structure";
    static UCA = "UCAs";
    static ControllerConstraint = "Controller Constraints";
    static LossScenario = "Loss Scenarios";
    static SafetyRequirement = "Safety Requirements";
    static Summary = "Summarized Safety Constraints";
}

/* the paths for the several diagrams of the STPA aspects */
export const SVG_PATH = "/images";
export const CONTROL_STRUCTURE_PATH = "/control-structure.svg";
export const HAZARD_PATH = "/hazard.svg";
export const SYSTEM_CONSTRAINT_PATH = "/system-constraint.svg";
export const RESPONSIBILITY_PATH = "/responsibility.svg";
export const SAFETY_REQUIREMENT_PATH = "/safety-requirement.svg";
export const COMPLETE_GRAPH_PATH = "/complete-graph.svg";
export const FILTERED_UCA_PATH = (controlAction: string): string => {
    return "/ucas/" + controlAction.replace(".", "-").replace(" ", "-") + ".svg";
};
export const UCA_PATH = FILTERED_UCA_PATH("all-UCAs");
export const FILTERED_CONTROLLER_CONSTRAINT_PATH = (controlAction: string): string => {
    return "/controller-constraints/" + controlAction.replace(".", "-").replace(" ", "-") + ".svg";
};
export const CONTROLLER_CONSTRAINT_PATH = FILTERED_CONTROLLER_CONSTRAINT_PATH("all-UCAs");
export const FILTERED_SCENARIO_PATH = (controlAction: string): string => {
    return "/scenarios/" + controlAction.replace(".", "-").replace(" ", "-") + ".svg";
};
export const SCENARIO_PATH = FILTERED_SCENARIO_PATH("all-UCAs");
export const SCENARIO_WITH_HAZARDS_PATH = FILTERED_SCENARIO_PATH("no-UCAs");

/* size multiplier for the diagrams */
export const SIZE_MULTIPLIER = 0.85;

export class StpaResult {
    title: string;
    goals: StpaComponent[] = [];
    assumptions: StpaComponent[] = [];
    losses: StpaComponent[] = [];
    hazards: StpaComponent[] = [];
    systemLevelConstraints: StpaComponent[] = [];
    // sorted by system components
    responsibilities: Record<string, StpaComponent[]> = {};
    // sorted first by control action, then by uca type
    ucas: Record<string, Record<string, StpaComponent[]>> = {};
    // sorted by control action
    controllerConstraints: Record<string, StpaComponent[]> = {};
    // sorted by control action and by ucas
    ucaScenarios: Record<string, Record<string, StpaComponent[]>> = {};
    scenarios: StpaComponent[] = [];
    safetyConstraints: StpaComponent[] = [];
}

export class StpaComponent {
    id: string;
    description: string;
    references?: string;
    subComponents?: StpaComponent[];
}