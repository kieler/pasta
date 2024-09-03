/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2022-2024 by
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

import {
    DropDownOption,
    SynthesisOption,
    TransformationOptionType,
    ValuedSynthesisOption,
} from "../../options/option-models";
import { SynthesisOptions, layoutCategory } from "../../synthesis-options";

const hierarchyID = "hierarchy";
const groupingUCAsID = "groupingUCAs";
export const filteringUCAsID = "filteringUCAs";

const showSysConsID = "showSysCons";
const showRespsID = "showResps";
const showContConsID = "showContCons";
const showScenariosID = "showScenarios";
const showScenariosWithHazardID = "showScenariosWithHazards";
const showUCAsID = "showUCAs";
const showSafetyConstraintsID = "showSafetyConstraints";

const showLabelsID = "showLabels";

const filterCategoryID = "filterCategory";

const showControlStructureID = "showControlStructure";
const showProcessModelsID = "showProcessModels";
const showRelationshipGraphID = "showRelationshipGraph";

/**
 * Category for filtering options.
 */
const filterCategory: SynthesisOption = {
    id: filterCategoryID,
    name: "Filtering",
    type: TransformationOptionType.CATEGORY,
    initialValue: 0,
    currentValue: 0,
    values: [],
};

/**
 * The option for the filter category.
 */
const filterCategoryOption: ValuedSynthesisOption = {
    synthesisOption: filterCategory,
    currentValue: 0,
};

/**
 * Boolean option to toggle the visualization of the control structure.
 */
const showControlStructureOption: ValuedSynthesisOption = {
    synthesisOption: {
        id: showControlStructureID,
        name: "Control Structure",
        type: TransformationOptionType.CHECK,
        initialValue: true,
        currentValue: true,
        values: [true, false],
        category: filterCategory,
    },
    currentValue: true,
};

/**
 * Boolean option to toggle the visualization of the process model of controllers.
 */
const showProcessModelsOption: ValuedSynthesisOption = {
    synthesisOption: {
        id: showProcessModelsID,
        name: "Process Models",
        type: TransformationOptionType.CHECK,
        initialValue: false,
        currentValue: false,
        values: [true, false],
        category: filterCategory,
    },
    currentValue: false,
};

/**
 * Boolean option to toggle the visualization of the relationship graph.
 */
const showRelationshipGraphOption: ValuedSynthesisOption = {
    synthesisOption: {
        id: showRelationshipGraphID,
        name: "Relationship Graph",
        type: TransformationOptionType.CHECK,
        initialValue: true,
        currentValue: true,
        values: [true, false],
        category: filterCategory,
    },
    currentValue: true,
};

/**
 * Boolean option to toggle the visualization of UCAs.
 */
const showUCAsOption: ValuedSynthesisOption = {
    synthesisOption: {
        id: showUCAsID,
        name: "UCAs",
        type: TransformationOptionType.CHECK,
        initialValue: true,
        currentValue: true,
        values: [true, false],
        category: filterCategory,
    },
    currentValue: true,
};

/**
 * Boolean option to toggle the visualization of safety constraints.
 */
const showSafetyConstraintsOption: ValuedSynthesisOption = {
    synthesisOption: {
        id: showSafetyConstraintsID,
        name: "Safety Constraints",
        type: TransformationOptionType.CHECK,
        initialValue: true,
        currentValue: true,
        values: [true, false],
        category: filterCategory,
    },
    currentValue: true,
};

/**
 * Boolean option to toggle the hierarchy representation in the relationship graph.
 */
const hierarchicalGraphOption: ValuedSynthesisOption = {
    synthesisOption: {
        id: hierarchyID,
        name: "Hierarchy",
        type: TransformationOptionType.CHECK,
        initialValue: true,
        currentValue: true,
        values: [true, false],
        category: layoutCategory,
    },
    currentValue: true,
};

/**
 * Values for the grouping of UCAs.
 */
export enum groupValue {
    NO_GROUPING,
    CONTROL_ACTION,
    SYSTEM_COMPONENT,
}

/**
 * Option to determine the grouping of UCAs.
 * It can be no grouping, grouping by control action or grouping by system component.
 */
const groupingOfUCAs: ValuedSynthesisOption = {
    synthesisOption: {
        id: groupingUCAsID,
        name: "Group UCAs",
        type: TransformationOptionType.CHOICE,
        initialValue: "No Grouping",
        currentValue: "No grouping",
        values: ["No Grouping", "Group by Control Action", "Group by System Component"],
        category: layoutCategory,
    },
    currentValue: "No Grouping",
};

/**
 * Option to filter the UCAs based on their control action
 */
const filteringOfUCAs: ValuedSynthesisOption = {
    synthesisOption: {
        id: filteringUCAsID,
        name: "Filter UCAs by Control Action",
        type: TransformationOptionType.DROPDOWN,
        currentId: "all UCAs",
        availableValues: [{ displayName: "all UCAs", id: "all UCAs" }],
        initialValue: "all UCAs",
        currentValue: "all UCAs",
        values: [],
        category: filterCategory,
    } as DropDownOption,
    currentValue: "all UCAs",
};

/**
 * Boolean option to toggle the visualization of system-level constraints.
 */
const showSysConsOption: ValuedSynthesisOption = {
    synthesisOption: {
        id: showSysConsID,
        name: "System-level Constraints",
        type: TransformationOptionType.CHECK,
        initialValue: true,
        currentValue: true,
        values: [true, false],
        category: filterCategory,
    },
    currentValue: true,
};

/**
 * Boolean option to toggle the visualization of responsibilities.
 */
const showRespsOption: ValuedSynthesisOption = {
    synthesisOption: {
        id: showRespsID,
        name: "Responsibilities",
        type: TransformationOptionType.CHECK,
        initialValue: true,
        currentValue: true,
        values: [true, false],
        category: filterCategory,
    },
    currentValue: true,
};

/**
 * Boolean option to toggle the visualization of controller constraints.
 */
const showContConsOption: ValuedSynthesisOption = {
    synthesisOption: {
        id: showContConsID,
        name: "Controller Constraints",
        type: TransformationOptionType.CHECK,
        initialValue: true,
        currentValue: true,
        values: [true, false],
        category: filterCategory,
    },
    currentValue: true,
};

/**
 * Boolean option to toggle the visualization of loss scenarios.
 */
const showScenariosOption: ValuedSynthesisOption = {
    synthesisOption: {
        id: showScenariosID,
        name: "Loss Scenarios",
        type: TransformationOptionType.CHECK,
        initialValue: true,
        currentValue: true,
        values: [true, false],
        category: filterCategory,
    },
    currentValue: true,
};

/**
 * Boolean option to toggle the visualization of loss scenarios that are not associated with a UCA.
 */
const showScenariosWithHazardsOption: ValuedSynthesisOption = {
    synthesisOption: {
        id: showScenariosWithHazardID,
        name: "Loss Scenarios Without UCAs",
        type: TransformationOptionType.CHECK,
        initialValue: true,
        currentValue: true,
        values: [true, false],
        category: filterCategory,
    },
    currentValue: true,
};

/**
 * Option to filter the node labels based on the aspect of the node.
 */
const showLabelsOption: ValuedSynthesisOption = {
    synthesisOption: {
        id: showLabelsID,
        name: "Show Labels of",
        type: TransformationOptionType.DROPDOWN,
        currentId: "losses",
        availableValues: [
            { displayName: "All", id: "all" },
            { displayName: "Losses", id: "losses" },
            { displayName: "Hazards", id: "hazards" },
            { displayName: "System Constraints", id: "systemConstraints" },
            { displayName: "Responsibilities", id: "responsibilities" },
            { displayName: "UCAs", id: "ucas" },
            { displayName: "Controller Constraints", id: "controllerConstraints" },
            { displayName: "Scenarios", id: "scenarios" },
            { displayName: "Safety Constraints", id: "safetyConstraints" },
            { displayName: "Automatic", id: "automatic" },
        ],
        initialValue: "losses",
        currentValue: "losses",
        values: [],
        category: layoutCategory,
    } as DropDownOption,
    currentValue: "losses",
};

/**
 * Values for filtering the node labels.
 */
export enum showLabelsValue {
    ALL,
    LOSSES,
    HAZARDS,
    SYSTEM_CONSTRAINTS,
    UCAS,
    RESPONSIBILITIES,
    CONTROLLER_CONSTRAINTS,
    SCENARIOS,
    SAFETY_CONSTRAINTS,
    AUTOMATIC,
}

export class StpaSynthesisOptions extends SynthesisOptions {
    constructor() {
        super();
        this.options.push(
            ...[
                filterCategoryOption,
                showLabelsOption,
                groupingOfUCAs,
                hierarchicalGraphOption,
                filteringOfUCAs,
                showControlStructureOption,
                showProcessModelsOption,
                showRelationshipGraphOption,
                showSysConsOption,
                showRespsOption,
                showUCAsOption,
                showContConsOption,
                showScenariosOption,
                showScenariosWithHazardsOption,
                showSafetyConstraintsOption,
            ]
        );
    }

    getShowLabels(): showLabelsValue {
        const option = this.getOption(showLabelsID);
        switch (option?.currentValue) {
            case "all":
                return showLabelsValue.ALL;
            case "losses":
                return showLabelsValue.LOSSES;
            case "hazards":
                return showLabelsValue.HAZARDS;
            case "systemConstraints":
                return showLabelsValue.SYSTEM_CONSTRAINTS;
            case "responsibilities":
                return showLabelsValue.RESPONSIBILITIES;
            case "ucas":
                return showLabelsValue.UCAS;
            case "controllerConstraints":
                return showLabelsValue.CONTROLLER_CONSTRAINTS;
            case "scenarios":
                return showLabelsValue.SCENARIOS;
            case "safetyConstraints":
                return showLabelsValue.SAFETY_CONSTRAINTS;
            case "automatic":
                return showLabelsValue.AUTOMATIC;
        }
        return option?.currentValue;
    }

    setShowRelationshipGraph(value: boolean): void {
        this.setOption(showRelationshipGraphID, value);
    }

    getShowRelationshipGraph(): boolean {
        return this.getOption(showRelationshipGraphID)?.currentValue;
    }

    setShowControlStructure(value: boolean): void {
        this.setOption(showControlStructureID, value);
    }

    getShowControlStructure(): boolean {
        return this.getOption(showControlStructureID)?.currentValue;
    }

    setShowProcessModels(value: boolean): void {
        this.setOption(showProcessModelsID, value);
    }

    getShowProcessModels(): boolean {
        return this.getOption(showProcessModelsID)?.currentValue;
    }

    setHierarchy(value: boolean): void {
        this.setOption(hierarchyID, value);
    }

    getHierarchy(): boolean {
        return this.getOption(hierarchyID)?.currentValue;
    }

    setGroupingUCAs(value: groupValue): void {
        const option = this.options.find(option => option.synthesisOption.id === groupingUCAsID);
        if (option) {
            switch (value) {
                case groupValue.NO_GROUPING:
                    option.currentValue = "No Grouping";
                    break;
                case groupValue.CONTROL_ACTION:
                    option.currentValue = "Group by Control Action";
                    break;
                case groupValue.SYSTEM_COMPONENT:
                    option.currentValue = "Group by System Component";
                    break;
            }
            option.synthesisOption.currentValue = option.currentValue;
        }
    }

    getGroupingUCAs(): groupValue {
        const option = this.getOption(groupingUCAsID);
        switch (option?.currentValue) {
            case "No Grouping":
                return groupValue.NO_GROUPING;
            case "Group by Control Action":
                return groupValue.CONTROL_ACTION;
            case "Group by System Component":
                return groupValue.SYSTEM_COMPONENT;
        }
        return option?.currentValue;
    }

    setFilteringUCAs(value: string): void {
        const option = this.options.find(option => option.synthesisOption.id === filteringUCAsID);
        if (option) {
            option.currentValue = value;
            option.synthesisOption.currentValue = value;
            (option.synthesisOption as DropDownOption).currentId = value;
        }
    }

    getFilteringUCAs(): string {
        return this.getOption(filteringUCAsID)?.currentValue;
    }

    setShowSysCons(value: boolean): void {
        this.setOption(showSysConsID, value);
    }

    getShowSysCons(): boolean {
        return this.getOption(showSysConsID)?.currentValue;
    }

    setShowResps(value: boolean): void {
        this.setOption(showRespsID, value);
    }

    getShowRespsCons(): boolean {
        return this.getOption(showRespsID)?.currentValue;
    }

    setShowUCAs(value: boolean): void {
        this.setOption(showUCAsID, value);
    }

    getShowUCAs(): boolean {
        return this.getOption(showUCAsID)?.currentValue;
    }

    setShowContCons(value: boolean): void {
        this.setOption(showContConsID, value);
    }

    getShowContCons(): boolean {
        return this.getOption(showContConsID)?.currentValue;
    }

    setShowScenarios(value: boolean): void {
        this.setOption(showScenariosID, value);
    }

    getShowScenarios(): boolean {
        return this.getOption(showScenariosID)?.currentValue;
    }

    setShowScenariosWithHazard(value: boolean): void {
        this.setOption(showScenariosWithHazardID, value);
    }

    getShowScenariosWithHazard(): boolean {
        return this.getOption(showScenariosWithHazardID)?.currentValue;
    }

    setShowSafetyConstraints(value: boolean): void {
        this.setOption(showSafetyConstraintsID, value);
    }

    getShowSafetyConstraints(): boolean {
        return this.getOption(showSafetyConstraintsID)?.currentValue;
    }

    /**
     * Updates the filterUCAs option with the availabe cotrol actions.
     * @param values The currently avaiable control actions.
     */
    updateFilterUCAsOption(values: { displayName: string; id: string }[]): void {
        const option = this.getOption(filteringUCAsID);
        if (option) {
            (option.synthesisOption as DropDownOption).availableValues = values;
            // if the last selected control action is not available anymore,
            // set the option to the first control action of the new list
            if (!values.find(val => val.id === (option.synthesisOption as DropDownOption).currentId)) {
                (option.synthesisOption as DropDownOption).currentId = values[0].id;
                option.synthesisOption.currentValue = values[0].id;
                option.synthesisOption.initialValue = values[0].id;
                option.currentValue = values[0].id;
            }
        }
    }
}
