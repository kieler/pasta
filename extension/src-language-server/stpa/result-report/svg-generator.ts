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

import { SetSynthesisOptionsAction } from "../../options/actions.js";
import { labelManagementValue } from '../../synthesis-options.js';
import { StpaSynthesisOptions } from "../diagram/stpa-synthesis-options.js";

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
export const FILTERED_CONTROLLER_CONSTRAINT_PATH = (controlAction: string): string => {
    return "/controller-constraints/" + controlAction.replace(".", "-").replace(" ", "-") + ".svg";
};
export const FILTERED_SCENARIO_PATH = (controlAction: string): string => {
    return "/scenarios/" + controlAction.replace(".", "-").replace(" ", "-") + ".svg";
};
export const SCENARIO_WITH_HAZARDS_PATH = FILTERED_SCENARIO_PATH("no-UCAs");

/* used to reset the options after diagrams were created */
const savedOptions: Map<string, string> = new Map();

/**
 * Saves the current values of the {@code options}.
 * @param options The synthesis options.
 */
export function saveOptions(options: StpaSynthesisOptions): void {
    options.getSynthesisOptions().forEach((option) => {
        savedOptions.set(option.synthesisOption.id, option.currentValue);
    });
}

/**
 * Sates the values of {@code options} to the ones saved in savedOptions.
 * @param options The synthesis options.
 * @returns an action to send the new values to the client.
 */
export function resetOptions(options: StpaSynthesisOptions): SetSynthesisOptionsAction {
    // set the values to the saved ones
    options.getSynthesisOptions().forEach((option) => {
        const savedValue = savedOptions.get(option.synthesisOption.id);
        if (savedValue) {
            option.currentValue = savedValue === "true" || savedValue === "false" ? savedValue === "true" : savedValue;
        }
        option.synthesisOption.currentValue = option.currentValue;
    });
    // create an action to set the options on the client
    const setSynthesisOption = {
        kind: SetSynthesisOptionsAction.KIND,
        options: options.getSynthesisOptions().map((option) => option.synthesisOption),
    } as SetSynthesisOptionsAction;
    return setSynthesisOption;
}

/**
 * Sets the values of {@code options} such that only the control structure is shown.
 * @param options The synthesis options.
 */
export function setControlStructureOptions(options: StpaSynthesisOptions): void {
    options.setShowRelationshipGraph(false);
    options.setShowControlStructure(true);
    options.setLabelManagement(labelManagementValue.NO_LABELS);
}

/**
 * Sets the values of {@code options} such that the relationship graph is reduced to the hazards.
 * @param options The synthesis options.
 */
export function setHazardGraphOptions(options: StpaSynthesisOptions): void {
    options.setShowRelationshipGraph(true);
    options.setShowControlStructure(false);
    options.setFilteringUCAs("all UCAs");
    options.setShowSysCons(false);
    options.setShowResps(false);
    options.setShowUCAs(false);
    options.setShowContCons(false);
    options.setShowScenarios(false);
    options.setShowScenariosWithHazard(false);
    options.setShowSafetyConstraints(false);
    options.setLabelManagement(labelManagementValue.NO_LABELS);
}

/**
 * Sets the values of {@code options} such that the relationship graph is reduced to the system-level constraints.
 * @param options The synthesis options.
 */
export function setSystemConstraintGraphOptions(options: StpaSynthesisOptions): void {
    options.setShowRelationshipGraph(true);
    options.setShowControlStructure(false);
    options.setFilteringUCAs("all UCAs");
    options.setShowSysCons(true);
    options.setShowResps(false);
    options.setShowUCAs(false);
    options.setShowContCons(false);
    options.setShowScenarios(false);
    options.setShowScenariosWithHazard(false);
    options.setShowSafetyConstraints(false);
    options.setLabelManagement(labelManagementValue.NO_LABELS);
}

/**
 * Sets the values of {@code options} such that the relationship graph is reduced to the responsibilities.
 * @param options The synthesis options.
 */
export function setResponsibilityGraphOptions(options: StpaSynthesisOptions): void {
    options.setShowRelationshipGraph(true);
    options.setShowControlStructure(false);
    options.setFilteringUCAs("all UCAs");
    options.setShowSysCons(true);
    options.setShowResps(true);
    options.setShowUCAs(false);
    options.setShowContCons(false);
    options.setShowScenarios(false);
    options.setShowScenariosWithHazard(false);
    options.setShowSafetyConstraints(false);
    options.setLabelManagement(labelManagementValue.NO_LABELS);
}

/**
 * Sets the values of {@code options} such that the relationship graph is filtered based on {@code value}.
 * @param options The synthesis options.
 * @param value The value the "filter UCA" option should be set to.
 */
export function setFilteredUcaGraphOptions(options: StpaSynthesisOptions, value: string): void {
    options.setShowRelationshipGraph(true);
    options.setShowControlStructure(false);
    options.setFilteringUCAs(value);
    options.setShowSysCons(false);
    options.setShowResps(true);
    options.setShowUCAs(true);
    options.setShowContCons(false);
    options.setShowScenarios(false);
    options.setShowScenariosWithHazard(false);
    options.setShowSafetyConstraints(false);
    options.setLabelManagement(labelManagementValue.NO_LABELS);
}

/**
 * Sets the values of {@code options} such that the relationship graph is reduced to the controller constraints without 
 * system-level constraints. The relationship graph is filtered based on {@code value} for the UCA filter.
 * @param options The synthesis options.
 */
export function setControllerConstraintWithFilteredUcaGraphOptions(options: StpaSynthesisOptions, value: string): void {
    options.setShowRelationshipGraph(true);
    options.setShowControlStructure(false);
    options.setFilteringUCAs(value);
    options.setShowSysCons(false);
    options.setShowResps(true);
    options.setShowUCAs(true);
    options.setShowContCons(true);
    options.setShowScenarios(false);
    options.setShowScenariosWithHazard(false);
    options.setShowSafetyConstraints(false);
    options.setLabelManagement(labelManagementValue.NO_LABELS);
}

/**
 * Sets the values of {@code options} such that the relationship graph is reduced to the loss scenarios without 
 * system-level constraints. The relationship graph is filtered based on {@code value} for the UCA filter.
 * @param options The synthesis options.
 */
export function setScenarioWithFilteredUCAGraphOptions(options: StpaSynthesisOptions, value: string): void {
    options.setShowRelationshipGraph(true);
    options.setShowControlStructure(false);
    options.setFilteringUCAs(value);
    options.setShowSysCons(false);
    options.setShowResps(true);
    options.setShowUCAs(true);
    options.setShowContCons(false);
    options.setShowScenarios(true);
    options.setShowScenariosWithHazard(false);
    options.setShowSafetyConstraints(false);
    options.setLabelManagement(labelManagementValue.NO_LABELS);
}

/**
 * Sets the values of {@code options} such that the relationship graph is reduced to the loss scenarios that are not 
 * connected to a UCA without system-level constraints. 
 * @param options The synthesis options.
 */
export function setScenarioWithNoUCAGraphOptions(options: StpaSynthesisOptions): void {
    options.setShowRelationshipGraph(true);
    options.setShowControlStructure(false);
    options.setFilteringUCAs("all UCAs");
    options.setShowSysCons(false);
    options.setShowResps(true);
    options.setShowUCAs(false);
    options.setShowContCons(false);
    options.setShowScenarios(true);
    options.setShowScenariosWithHazard(true);
    options.setShowSafetyConstraints(false);
    options.setLabelManagement(labelManagementValue.NO_LABELS);
}

/**
 * Sets the values of {@code options} such that the relationship graph is reduced to the loss scenarios without system-level constraints. 
 * @param options The synthesis options.
 */
export function setAllScenariosOptions(options: StpaSynthesisOptions): void {
    options.setShowRelationshipGraph(true);
    options.setShowControlStructure(false);
    options.setFilteringUCAs("all UCAs");
    options.setShowSysCons(false);
    options.setShowResps(true);
    options.setShowUCAs(true);
    options.setShowContCons(false);
    options.setShowScenarios(true);
    options.setShowScenariosWithHazard(true);
    options.setShowSafetyConstraints(false);
    options.setLabelManagement(labelManagementValue.NO_LABELS);
}

/**
 * Sets the values of {@code options} such that the relationship graph is reduced to the safety constraints without system-level constraints.
 * @param options The synthesis options.
 */
export function setSafetyRequirementGraphOptions(options: StpaSynthesisOptions): void {
    options.setShowRelationshipGraph(true);
    options.setShowControlStructure(false);
    options.setFilteringUCAs("all UCAs");
    options.setShowSysCons(false);
    options.setShowResps(true);
    options.setShowUCAs(true);
    options.setShowContCons(true);
    options.setShowScenarios(true);
    options.setShowScenariosWithHazard(true);
    options.setShowSafetyConstraints(true);
    options.setLabelManagement(labelManagementValue.NO_LABELS);
}

/**
 * Sets the values of {@code options} such that the whole relationship graph is shown and the control structure is hidden.
 * @param options The synthesis options.
 */
export function setRelationshipGraphOptions(options: StpaSynthesisOptions): void {
    options.setShowRelationshipGraph(true);
    options.setShowControlStructure(false);
    options.setFilteringUCAs("all UCAs");
    options.setShowSysCons(true);
    options.setShowResps(true);
    options.setShowUCAs(true);
    options.setShowContCons(true);
    options.setShowScenarios(true);
    options.setShowScenariosWithHazard(true);
    options.setShowSafetyConstraints(true);
    options.setLabelManagement(labelManagementValue.NO_LABELS);
}
