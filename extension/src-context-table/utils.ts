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

import { VNode } from "snabbdom";
import { createSelector, createText, patch } from "./html";
import { ContextTableControlAction, ContextTableRule, ContextTableVariableValues, Type} from './utils-classes';
import { RULE_TYPE_MAPPINGS, RuleType, VALID_RULE_TYPES } from "./utils-types";

declare const vscode: { postMessage(message: any): void };

/** Function that test if a type is valid. */
function isValidRuleType(type: string): type is RuleType {
    return VALID_RULE_TYPES.includes(type as RuleType);
}

/**
 * Get the correct hazardous? headers for a provided type.
 * @param selectedType The currently selected rule type.
 * @returns List of header strings for table.
 */
export function getHeadersForType(selectedType: Type): string[] {
    switch (selectedType) {
        case Type.PROVIDED:
            return RULE_TYPE_MAPPINGS.slice(0, 3).map(m => m.header);
        case Type.BOTH:
            return RULE_TYPE_MAPPINGS.map(m => m.header);
        case Type.NOT_PROVIDED:
            return []; 
        default:
            return [];
    }
}

/**
 * Returns the index in the table of a uca type.
 * @param rule A rule from the context table.
 * @param selectedType The selected rule type for the context table.
 * @returns The index of the selected uca type
 */
export function getColumnIndexForRule(rule: ContextTableRule, selectedType: Type): number | null {
    const ruleType = rule.type.toLowerCase();
    
    // Validate the rule type (should always be valid from AST)
    if (!isValidRuleType(ruleType)) {
        console.warn(`Invalid rule type from AST: ${ruleType}`);
        return null;
    }
    
    if (ruleType === "not-provided") {
        return selectedType === Type.BOTH ? 3 : 0;
    }
    
    if (ruleType === "provided") {
        return selectedType !== Type.NOT_PROVIDED ? 0 : null;
    }
    
    for (const mapping of RULE_TYPE_MAPPINGS) {
        if (mapping.ruleTypes.includes(ruleType)) {
            // exclude not-provided
            if (selectedType === Type.PROVIDED && mapping.index < 3) {
                return mapping.index;
            }
            if (selectedType === Type.BOTH) {
                return mapping.index;
            }
        }
    }
    
    return null;
}

/**
 * Gets the possible UCA types for the selected rule type at position columnIndex.
 * @param selectedType The selected rule type of the context table.
 * @param columnIndex The current index of the cell in question.
 * @returns A string of all the possible UCA types of the cell.
 */
export function getUCATypeString(selectedType: Type, columnIndex: number): string {
    const mappings = selectedType === Type.NOT_PROVIDED 
        ? [RULE_TYPE_MAPPINGS[3]] 
        : selectedType === Type.PROVIDED 
        ? RULE_TYPE_MAPPINGS.slice(0, 3) 
        : RULE_TYPE_MAPPINGS;
    
    const mapping = mappings[columnIndex];
    return mapping ? mapping.ruleTypes.join('/') : '';
}

/**
 * Concats the elements of each controlaction in {@code controlactions} with a dot.
 * @param controlactions A list containing controlactions that should be converted to strings.
 * @returns A list containing the resulting strings.
 */
export function convertControlActionsToStrings(controlactions: ContextTableControlAction[]): string[] {
    const result: string[] = [];
    controlactions.forEach(controlAction => {
        const combineStr = controlAction.controller + "." + controlAction.action;
        result.push(combineStr);
    });
    return result;
}

/**
 * Creates a new selector with the given {@code options} that replaces the given {@code selector}.
 * @param selector The selection element to replace.
 * @param options A list of options the new selector should have.
 * @param index The selected index of the selector.
 * @returns A new selector VNode.
 */
export function replaceSelector(selector: HTMLSelectElement, options: string[], index: number): VNode {
    const newSelector = createSelector(selector.id, index, options, selector.style.top, selector.style.left);
    patch(selector, newSelector);
    return newSelector;
}

/**
 * Adds a text element to {@code parent} with the given attributes.
 * @param parent Element to which the text should be added.
 * @param text The text that should be added.
 */
export function addText(parent: HTMLElement, text: string): void {
    const placeholderActionDescriptions = document.createElement("pre");
    parent.appendChild(placeholderActionDescriptions);
    const actionDescriptions = createText(text);
    patch(placeholderActionDescriptions, actionDescriptions);
}

/**
 * Adds a selector element to {@code parent} with the given attributes.
 * @param parent Element to which the selector should be added.
 * @param id The id of the selector.
 * @param index Selected Index of the selector.
 * @param options The options the selector contains.
 * @param topDistance The distance of the text to the top border.
 * @param leftDistance The distance of the text to the left border.
 */
export function addSelector(parent: HTMLElement, id: string, index: number, options: string[], topDistance: string, leftDistance: string): void {
    const placeholderTypeSelector = document.createElement("select");
    parent.append(placeholderTypeSelector);
    const typeSelector = createSelector(id, index, options, topDistance, leftDistance);
    patch(placeholderTypeSelector, typeSelector);
}

/**
 * Get all the process variables of a row of the context table
 * @param target The target cell in a row that was selected
 * @returns A list of process variable strings.
 */
export function getRowData(target: HTMLElement): string[] {
    const rowParent = target.parentNode?.parentNode?.parentNode;
    const children = rowParent?.children;
    const processVars: string[] = [];
    if (children) {
        for (const child of Array.from(children)) {
            if (child.matches("td.context-variable") && child.textContent) {
                processVars.push(child.textContent);
            }
        }
    }
    return processVars;
} 

/**
 * Combines the currently selected process variable values with the process variables name.
 * @param variables The context table variables and their values.
 * @param selectedValues The selected values of the process variables.
 * @returns A map from the process variable name to the currently selected value.
 */
export function createVarMap(variables: ContextTableVariableValues[], selectedValues: string[]): Record<string, string> {
    return variables.reduce((map, variable, index) => {
        map[variable.name] = selectedValues[index];
        return map;
    }, {} as Record<string, string>);
}

/**
 * Function that post a message with the correct rule input to the language server.
 * @param detail The detail object containing the necessary information to build the rule.
 */
export function postAddRule(detail: {
        type: string;
        controlAction: ContextTableControlAction;
        varMap: Record<string, string>;
    }): void {
    try {
        vscode.postMessage({ addRule: detail });
    } catch (e) {
        console.error("post addRule failed:", e);
    }
}