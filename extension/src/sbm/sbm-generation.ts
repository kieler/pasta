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

import * as vscode from "vscode";
import { createDataflows } from "./dataflow-generation";
import { createFSMs } from "./fsm-generation";
import { Enum, LTLFormula, UCA_TYPE, Variable } from "./utils-classes";

/**
 * Creates a safe behavioral model for each controller.
 * @param controlActionsMap The control actions for each controller.
 * @param formulaMap The ltl formulas for each controller.
 */
// export async function createSBMs(
//     controlActionsMap: Record<string, string[]>,
//     formulaMap: Record<string, LTLFormula[]>
// ): Promise<void> {
//     for (const controller of Object.keys(controlActionsMap)) {
//         // await createControllerSBM(controller, controlActionsMap[controller], formulaMap[controller] ?? []);
//     }
// }

export function createSBMs(
    controlActionsMap: Record<string, string[]>,
    formulaMap: Record<string, LTLFormula[]>,
): void {
    // create a quick pick to ask the user whether they want to create FSMs or dataflows
    const quickPick = vscode.window.createQuickPick();
    quickPick.items = [{ label: "FSM" }, { label: "Dataflow" }];
    quickPick.onDidChangeSelection(selection => {
        if (selection[0]?.label === "FSM") {
            createFSMs(controlActionsMap, formulaMap);
        } else {
            createDataflows(controlActionsMap, formulaMap);
        }
        quickPick.hide();
    });
    quickPick.onDidHide(() => quickPick.dispose());
    quickPick.show();
}

export async function askForPath(): Promise<string | undefined> {
    // Ask the user where to save the sbm
    const currentFolder = vscode.workspace.workspaceFolders
        ? vscode.workspace.workspaceFolders[0].uri.fsPath
        : undefined;
    const uri = await vscode.window.showSaveDialog({
        filters: { SCChart: ["sctx"] },
        // TODO: not possible with current vscode version
        // title: 'Save SBM to...',
        defaultUri: currentFolder ? vscode.Uri.file(`${currentFolder}/sbm.sctx`) : undefined,
    });

    return uri?.path;
}

/**
 * Collects the context variables that occur in the {@code ltlFormulas}.
 * @param ltlFormulas The formulas which context variables should be collected.
 * @returns the context variables that occur in the {@code ltlFormulas}.
 */
export function collectContextVariables(ltlFormulas: LTLFormula[]): { variables: Variable[]; enums: Enum[] } {
    // variables should not be collected more than once
    const variableNames = new Set<string>();
    const variables: Variable[] = [];
    const enums: Enum[] = [];
    ltlFormulas.forEach(ltlFormula => {
        // the variables are connected by logical ands
        const expressions = ltlFormula.contextVariables.split("&&");
        expressions.forEach(expression => {
            const operands = expression.split(/>=|<=|>|<|==|!=/);
            if (operands.length === 1) {
                // variable is a boolean
                let varName = "";
                if (operands[0].trim().charAt(0) === "!") {
                    varName = operands[0].trim().substring(1);
                } else {
                    varName = operands[0].trim();
                }
                if (!variableNames.has(varName)) {
                    variableNames.add(varName);
                    variables.push({ name: varName, type: "bool", input: true });
                }
            } else {
                // two integer operands
                const firstOperand = operands[0].trim();
                const secondOperand = operands[1].trim();
                addVariable(variableNames, variables, firstOperand, true);
                if (secondOperand.indexOf(".") !== -1) {
                    // second operand is an enum
                    addEnum(variableNames, enums, secondOperand, variables, firstOperand);
                } else {
                    addVariable(variableNames, variables, secondOperand, true);
                }
            }
        });
    });
    return { variables, enums };
}

/**
 * Adds an enum to the {@code enums} if it is not already contained.
 * @param variableNames Contains the names of the variables that are already contained in the {@code enums}.
 * @param enums The enums to which the enum should be added.
 * @param operand Name of the enum to add.
 * @param variables Contains the variables that are already collected.
 * @param variableName Name of the variable that is assigned a value of the enum.
 */
function addEnum(
    variableNames: Set<string>,
    enums: Enum[],
    operand: string,
    variables: Variable[],
    variableName: string,
): void {
    if (!variableNames.has(operand)) {
        const enumName = operand.substring(0, operand.indexOf("."));
        const enumValue = operand.substring(operand.indexOf(".") + 1);
        const enumDeclaration = enums.find(enumElement => enumElement.name === enumName);
        if (enumDeclaration === undefined) {
            enums.push({ name: enumName, values: [enumValue] });
        } else {
            enumDeclaration.values.push(enumValue);
        }
        // update the type of the first operand to enum
        const firstVariable = variables.find(variable => variable.name === variableName);
        if (firstVariable !== undefined && !firstVariable.type.startsWith("ref")) {
            firstVariable.type = "ref " + enumName;
        }
        // add the operand to the variables
        variableNames.add(operand);
    }
}

/**
 * Adds a variable to the {@code variables} if it is not already contained.
 * @param variableNames Contains the names of the variables that are already contained in the {@code variables}.
 * @param variables The variables to which the {@code operand} should be added.
 * @param operand Name of the variable that should be added.
 * @param input Determines whether the variable is an input variable.
 */
function addVariable(variableNames: Set<string>, variables: Variable[], operand: string, input: boolean): void {
    // operands may be variables or numbers so we need to check that before collecting them
    if (!variableNames.has(operand) && !isNumber(operand)) {
        variableNames.add(operand);
        variables.push({ name: operand, type: "int", input: input });
    }
}

/**
 * Checks whether {@code text} is a number.
 * @param text The operand check.
 * @returns true if {@code text} is a number.
 */
function isNumber(text: string): boolean {
    return !isNaN(parseInt(text));
}

/**
 * Collects the output variables for the given control actions.
 * @param controlActions The control actions, which should be converted to output variables.
 * @returns The list of collected output variables.
 */
export function collectControlActionVariables(controlActions: string[]): Variable[] {
    const variables: Variable[] = [];
    for (const controlAction of controlActions) {
        variables.push({ name: controlAction, type: "bool", output: true });
    }
    return variables;
}

/**
 * Groups the {@code ltlFormulas} by their control action and UCA type.
 * TOO-LATE is grouped together with NOT-PROVIDED since they are both handled the same way in the sbm syntheses.
 * @param ltlFormulas The ltl formulas to group.
 * @returns the {@code ltlFormulas} grouped by their control action and UCA type.
 */
export function groupFormulasByActionAndType(ltlFormulas: LTLFormula[]): {
    notProvidedMap: Map<string, LTLFormula[]>;
    providedMap: Map<string, LTLFormula[]>;
    appliedTooLongMap: Map<string, LTLFormula[]>;
    stoppedTooSoonMap: Map<string, LTLFormula[]>;
} {
    const notProvidedMap = new Map<string, LTLFormula[]>();
    const providedMap = new Map<string, LTLFormula[]>();
    const appliedTooLongMap = new Map<string, LTLFormula[]>();
    const stoppedTooSoonMap = new Map<string, LTLFormula[]>();
    ltlFormulas.forEach(formula => {
        const action = getControlActionFromLTL(formula).toLowerCase();
        switch (formula.type) {
            case UCA_TYPE.NOT_PROVIDED:
            case UCA_TYPE.TOO_LATE:
                notProvidedMap.has(action)
                    ? notProvidedMap.get(action)?.push(formula)
                    : notProvidedMap.set(action, [formula]);
                break;
            case UCA_TYPE.PROVIDED:
                providedMap.has(action) ? providedMap.get(action)?.push(formula) : providedMap.set(action, [formula]);
                break;
            case UCA_TYPE.APPLIED_TOO_LONG:
                appliedTooLongMap.has(action)
                    ? appliedTooLongMap.get(action)?.push(formula)
                    : appliedTooLongMap.set(action, [formula]);
                break;
            case UCA_TYPE.STOPPED_TOO_SOON:
                stoppedTooSoonMap.has(action)
                    ? stoppedTooSoonMap.get(action)?.push(formula)
                    : stoppedTooSoonMap.set(action, [formula]);
                break;
            case UCA_TYPE.TOO_EARLY:
                // too early is not handled since it cannot be translated to transitions
                break;
        }
    });
    return { notProvidedMap, providedMap, appliedTooLongMap, stoppedTooSoonMap };
}



/**
 * Determines the control action the {@code ltlFormula} is defined for.
 * @param ltlFormula The ltl formula for which the control action should be determined.
 * @returns the control action the {@code ltlFormula} is defined for.
 */
function getControlActionFromLTL(ltlFormula: LTLFormula): string {
    // Calculation based on the assumption that the control action is stated first in the description
    // and has the form<controller.action>
    const startIndex = ltlFormula.description.indexOf(".");
    const endIndex = ltlFormula.description.indexOf(" ");
    const action = ltlFormula.description.substring(startIndex + 1, endIndex);
    return action;
}
