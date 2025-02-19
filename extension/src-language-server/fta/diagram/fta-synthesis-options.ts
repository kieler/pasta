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

import { DropDownOption, SynthesisOption, TransformationOptionType, ValuedSynthesisOption } from "../../options/option-models.js";
import { SynthesisOptions, layoutCategory } from "../../synthesis-options.js";

const cutSetsID = "cutSets";
const showGateDescriptionsID = "showGateDescriptions";
const showComponentDescriptionsID = "showComponentDescriptions";

const analysisCategoryID = "analysisCategory";

export const noCutSet = { displayName: "---", id: "---" };
/* Single Point of Failure */
export const spofsSet = { displayName: "SPoFs", id: "SPoFs" };

/**
 * Category for analysis options.
 */
export const analysisCategory: SynthesisOption = {
    id: analysisCategoryID,
    name: "Analysis",
    type: TransformationOptionType.CATEGORY,
    initialValue: 0,
    currentValue: 0,
    values: [],
};

/**
 * The option for the analysis category.
 */
const analysisCategoryOption: ValuedSynthesisOption = {
    synthesisOption: analysisCategory,
    currentValue: 0,
};

/**
 * Boolean option to toggle the visualization gate descriptions.
 */
const showGateDescriptionsOptions: ValuedSynthesisOption = {
    synthesisOption: {
        id: showGateDescriptionsID,
        name: "Show Gate Descriptions",
        type: TransformationOptionType.CHECK,
        initialValue: true,
        currentValue: true,
        values: [true, false],
        category: layoutCategory,
    },
    currentValue: true,
};

/**
 * Boolean option to toggle the visualization node descriptions.
 */
const showComponentDescriptionsOptions: ValuedSynthesisOption = {
    synthesisOption: {
        id: showComponentDescriptionsID,
        name: "Show Component Descriptions",
        type: TransformationOptionType.CHECK,
        initialValue: false,
        currentValue: false,
        values: [true, false],
        category: layoutCategory,
    },
    currentValue: false,
};

/**
 * Option to highlight the components of a cut set.
 */
const cutSets: ValuedSynthesisOption = {
    synthesisOption: {
        id: cutSetsID,
        name: "Highlight Cut Set",
        type: TransformationOptionType.DROPDOWN,
        currentId: noCutSet.id,
        availableValues: [noCutSet],
        initialValue: noCutSet.id,
        currentValue: noCutSet.id,
        values: [noCutSet],
        category: analysisCategory,
    } as DropDownOption,
    currentValue: noCutSet.id,
};

export class FtaSynthesisOptions extends SynthesisOptions {
    protected spofs: string[];
    constructor() {
        super();
        this.options.push(...[analysisCategoryOption, cutSets, showGateDescriptionsOptions, showComponentDescriptionsOptions]);
    }

    getShowGateDescriptions(): boolean {
        return this.getOption(showGateDescriptionsID)?.currentValue;
    }

    getShowComponentDescriptions(): boolean {
        return this.getOption(showComponentDescriptionsID)?.currentValue;
    }

    /**
     * Updates the cutSets option with the availabe cut sets.
     * @param values The currently avaiable cut sets.
     */
    updateCutSetsOption(values: { displayName: string; id: string }[]): void {
        const option = this.getOption(cutSetsID);
        if (option) {
            (option.synthesisOption as DropDownOption).availableValues = [noCutSet, spofsSet, ...values];
            (option.synthesisOption as DropDownOption).values = [noCutSet, spofsSet, ...values];
            // if the last selected cut set is not available anymore, set the option to no cut set
            if (!values.find((val) => val.id === (option.synthesisOption as DropDownOption).currentId)) {
                (option.synthesisOption as DropDownOption).currentId = noCutSet.id;
                option.synthesisOption.currentValue = noCutSet.id;
                option.synthesisOption.initialValue = noCutSet.id;
                option.currentValue = noCutSet.id;
            }
        }
    }

    /**
     * Resets the cutSets option to no cut set.
     */
    resetCutSets(): void {
        const option = this.getOption(cutSetsID);
        if (option) {
            (option.synthesisOption as DropDownOption).availableValues = [noCutSet];
            (option.synthesisOption as DropDownOption).values = [noCutSet];
            (option.synthesisOption as DropDownOption).currentId = noCutSet.id;
            option.synthesisOption.currentValue = noCutSet.id;
            option.synthesisOption.initialValue = noCutSet.id;
            option.currentValue = noCutSet.id;
        }
    }

    setCutSet(value: string): void {
        const option = this.options.find((option) => option.synthesisOption.id === cutSetsID);
        if (option) {
            option.currentValue = value;
            option.synthesisOption.currentValue = value;
            (option.synthesisOption as DropDownOption).currentId = value;
        }
    }

    getCutSet(): string {
        return this.getOption(cutSetsID)?.currentValue;
    }

    setSpofs(spofs: string[]): void {
        this.spofs = spofs;
    }

    getSpofs(): string[] {
        return this.spofs;
    }
}
