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

import { RangeOption, SynthesisOption, TransformationOptionType, ValuedSynthesisOption } from "./options/option-models";

const labelManagementID = "labelManagement";
const labelShorteningWidthID = "labelShorteningWidth";
const modelOrderID = "modelOrder";

const layoutCategoryID = "layoutCategory";

/**
 * Category for layout options.
 */
export const layoutCategory: SynthesisOption = {
    id: layoutCategoryID,
    name: "Layout",
    type: TransformationOptionType.CATEGORY,
    initialValue: 0,
    currentValue: 0,
    values: [],
};

/**
 * The option for the layout category.
 */
const layoutCategoryOption: ValuedSynthesisOption = {
    synthesisOption: layoutCategory,
    currentValue: 0,
};

/**
 * Slider to set the desired width of label lines.
 */
const labelShorteningWidthOption: ValuedSynthesisOption = {
    synthesisOption: {
        id: labelShorteningWidthID,
        name: "Shortening Width",
        type: TransformationOptionType.RANGE,
        initialValue: 30,
        currentValue: 30,
        range: { first: 0, second: 100 },
        stepSize: 1,
        values: [],
        category: layoutCategory,
    } as RangeOption,
    currentValue: 30,
};

/**
 * Option to determine the display of node labels.
 * It can be original labels (whole label in one line), wrapping (label is wrapped into multiple lines), 
 * truncate (label is truncated) or no labels.
 */
const labelManagementOption: ValuedSynthesisOption = {
    synthesisOption: {
        id: labelManagementID,
        name: "Node Label Management",
        type: TransformationOptionType.CHOICE,
        initialValue: "Wrapping",
        currentValue: "Wrapping",
        values: ["Original Labels", "Wrapping", "Truncate", "No Labels"],
        category: layoutCategory,
    },
    currentValue: "Wrapping",
};

/**
 * Boolean option to toggle model order.
 */
const modelOrderOption: ValuedSynthesisOption = {
    synthesisOption: {
        id: modelOrderID,
        name: "Model Order",
        type: TransformationOptionType.CHECK,
        initialValue: true,
        currentValue: true,
        values: [true, false],
        category: layoutCategory,
    },
    currentValue: true,
};

/**
 * Values for general the label management.
 */
export enum labelManagementValue {
    ORIGINAL,
    WRAPPING,
    TRUNCATE,
    NO_LABELS,
}

export class SynthesisOptions {
    protected options: ValuedSynthesisOption[];

    constructor() {
        this.options = [
            layoutCategoryOption,
            labelManagementOption,
            labelShorteningWidthOption,
            modelOrderOption];
    }

    getSynthesisOptions(): ValuedSynthesisOption[] {
        return this.options;
    }

    protected getOption(id: string): ValuedSynthesisOption | undefined {
        const option = this.options.find((option) => option.synthesisOption.id === id);
        return option;
    }

    getLabelManagement(): labelManagementValue {
        const option = this.options.find((option) => option.synthesisOption.id === labelManagementID);
        switch (option?.currentValue) {
            case "Original Labels":
                return labelManagementValue.ORIGINAL;
            case "Wrapping":
                return labelManagementValue.WRAPPING;
            case "Truncate":
                return labelManagementValue.TRUNCATE;
            case "No Labels":
                return labelManagementValue.NO_LABELS;
        }
        return option?.currentValue;
    }

    getLabelShorteningWidth(): number {
        return this.getOption(labelShorteningWidthID)?.currentValue;
    }

    getModelOrder(): boolean {
        return this.getOption(modelOrderID)?.currentValue;
    }
}
