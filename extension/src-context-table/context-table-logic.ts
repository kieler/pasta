/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2022 by
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

import { ContextCell } from "./utils";
import { ContextTableRule, ContextTableVariable, Type } from "./utils-classes";

/**
/**
 * Determines the used rules of {@code rules} and for which column they apply.
 * @param variables The variable values of the current row.
 * @param rules The available rules.
 * @param selectedController The currently selected controller.
 * @param selectedAction The currently selected control action.
 * @param selectedType The currently selected control action type.
 * @returns the used rules, whereby the index determines the column they apply to.
 */
export function determineUsedRules(
    variables: ContextTableVariable[],
    rules: ContextTableRule[],
    selectedController: string,
    selectedAction: string,
    selectedType: number
): ContextTableRule[][] {
    // keeps track of the used rules, whereby the index determines the column
    let usedRules: ContextTableRule[][] = [[], [], [], []];
    switch (selectedType) {
        case Type.NOT_PROVIDED:
            usedRules = [[]];
            break;
        case Type.PROVIDED:
            usedRules = [[], [], []];
            break;
        case Type.BOTH:
            usedRules = [[], [], [], []];
            break;
        default:
            console.log("Something went wrong. An undefined control action type is selected.");
    }
    // determine the used rules
    rules.forEach(rule => {
        // compare control action of the rule with the selected one and
        // the context of the rule with the current context
        if (
            rule.controlAction.controller === selectedController &&
            rule.controlAction.action === selectedAction &&
            checkValues(rule.variables, variables)
        ) {
            // determine the column for which the rule applies
            const ruleType = rule.type.toLowerCase();
            if (selectedType === Type.NOT_PROVIDED && ruleType === "not-provided") {
                usedRules[0].push(rule);
            } else if (selectedType !== Type.NOT_PROVIDED && ruleType === "provided") {
                usedRules[0].push(rule);
            } else if (
                selectedType !== Type.NOT_PROVIDED &&
                (ruleType === "too-early" || ruleType === "too-late" || ruleType === "wrong-time")
            ) {
                usedRules[1].push(rule);
            } else if (
                selectedType !== Type.NOT_PROVIDED &&
                (ruleType === "stopped-too-soon" || ruleType === "applied-too-long")
            ) {
                usedRules[2].push(rule);
            } else if (selectedType === Type.BOTH && ruleType === "not-provided") {
                usedRules[3].push(rule);
            }
        }
    });
    return usedRules;
}

/**
 * Creates the result cells.
 * @param results The hazards and rules for the result columns.
 * @returns The cells for the "Hazardous?"-column.
 */
export function createResults(results: { hazards: string[]; rules: ContextTableRule[] }[]): ContextCell[] {
    const cells: ContextCell[] = [];
    // keeps track on how many neihbouring columns have no rule applied
    let noAppliedRuleCounter: number = 0;
    // go through all of the hazardous columns
    for (let hazardColumn = 0; hazardColumn < results.length; hazardColumn++) {
        if (results[hazardColumn].rules.length === 0) {
            // there is no rule for this column
            noAppliedRuleCounter++;
            if (hazardColumn + 1 === results.length) {
                // its the last column so we can fill the missing columns with a cell containing the value "No"
                cells.push({ cssClass: "result", value: "No", colSpan: noAppliedRuleCounter });
            }
        } else {
            // it may be that previous columns had no rule
            // in this case a cell with value "No" must be created that covers these columns
            if (noAppliedRuleCounter !== 0) {
                cells.push({ cssClass: "result", value: "No", colSpan: noAppliedRuleCounter });
                noAppliedRuleCounter = 0;
            }
            const ucas = results[hazardColumn].rules.map(rule => rule.id);
            // add the hazards, defined by the rule, as a cell
            cells.push({
                cssClass: "result",
                value: ucas.toString(),
                colSpan: 1,
                title: results[hazardColumn].hazards.toString(),
            });
        }
    }
    return cells;
}

/**
 * Checks whether the values of {@code variables1} and {@code variables2} are the same
 * @param variables1 Variables that should be compared to the other set.
 * @param variables2 Variables that should be compared to the other set.
 * @returns true if all values are equal; false otherwise.
 */
function checkValues(variables1: ContextTableVariable[], variables2: ContextTableVariable[]): boolean {
    for (let i = 0; i < variables1.length; i++) {
        const firstVariable = variables1[i];
        // get corresponding variable
        const correspondingVariable = variables2.find(secondVariable => secondVariable.name === firstVariable.name);
        // check values
        if (firstVariable.value !== correspondingVariable?.value) {
            return false;
        }
    }
    return true;
}
