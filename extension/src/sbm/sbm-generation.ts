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
import { createFile } from "../utils";
import { createSCChartText } from "./scchart-creation";
import { EMPTY_STATE_NAME, Enum, LTLFormula, State, Transition, UCA_TYPE, Variable } from "./utils";

/**
 * Creates a safe behavioral model for each controller.
 * @param controlActionsMap The control actions for each controller.
 * @param formulaMap The ltl formulas for each controller.
 */
export function createSBMs(
    controlActionsMap: Record<string, string[]>,
    formulaMap: Record<string, LTLFormula[]>
): void {
    Object.keys(controlActionsMap).forEach(async controller =>
        await createControllerSBM(controller, controlActionsMap[controller], formulaMap[controller] ?? [])
    );
}

/**
 * Creates a safe behavioral model with the given components.
 * @param controllerName The name of the controller to model.
 * @param controlActions The control actions of the controller.
 * @param ltlFormulas The ltl formulas for the controller.
 * @returns
 */
async function createControllerSBM(
    controllerName: string,
    controlActions: string[],
    ltlFormulas: LTLFormula[]
): Promise<void> {
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
    if (uri === undefined) {
        // The user did not pick any file to save to.
        return;
    }

    // group formulas and create states for control actions
    const formulaMap = groupFormulasByActionAndType(ltlFormulas);
    let states = createStatesForActions(controlActions);
    // add transitions to the states
    // when adding transition for continous UCA types new states may be added
    states = addTransitions(formulaMap, states);
    states = filterReachableStates(states);

    // sort the transitions so that the ones to the empty state are always the last transitions
    /* Must be done because the transitions to the empty state should only ensure that the state is left 
    (for types providing and applied-too-long). When another transition is possible, it should be taken. 
    When not using priorities, the triggers must be adjusted to be exclusive */
    states.forEach(state => {
        state.transitions.sort((a, _) => {
            if (a.target === EMPTY_STATE_NAME) {
                return 1;
            }
            return -1;
        });
    });

    // determine the variables for the scchart including a variable for the control action
    const controlActionVariable = { name: "controlAction", type: `ref ${controllerName}`, output: true };
    const contextVariables = collectContextVariables(ltlFormulas);
    const variables = contextVariables.variables.concat([controlActionVariable]);
    // create the scchart
    const scchartText = createSCChartText(
        controllerName,
        states,
        variables,
        contextVariables.enums,
        ltlFormulas,
        ["NULL"].concat(controlActions)
    );
    createFile(uri.path, scchartText);
}

/**
 * Collects the context variables that occur in the {@code ltlFormulas}.
 * @param ltlFormulas The formulas which context variables should be collected.
 * @returns the context variables that occur in the {@code ltlFormulas}.
 */
function collectContextVariables(ltlFormulas: LTLFormula[]): { variables: Variable[]; enums: Enum[] } {
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
                    variables.push({ name: varName, type: "bool" });
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
    variableName: string
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

/**
 * Groups the {@code ltlFormulas} by their control action and UCA type.
 * @param ltlFormulas The ltl formulas to group.
 * @returns the {@code ltlFormulas} grouped by their control action and UCA type.
 */
function groupFormulasByActionAndType(ltlFormulas: LTLFormula[]): {
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
        const action = getControlActionFromLTL(formula);
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
 * Creates a state for each of the {@code controlActions}.
 * @param controlActions The control actions for which states should be created.
 * @returns the states representing the {@code controlActions}.
 */
function createStatesForActions(controlActions: string[]): State[] {
    // one state representing that no control action is active
    const states: State[] = [
        {
            name: EMPTY_STATE_NAME,
            controlAction: "NULL",
            transitions: [],
        },
    ];
    // adds a state for each control action
    controlActions.forEach(controlAction => {
        const state: State = {
            name: controlAction,
            controlAction: controlAction,
            transitions: [],
        };
        states.push(state);
    });
    return states;
}

/**
 * Adds transitions to the {@code states} such that the ltl Formulas in {@code maps} are respected.
 * @param maps The maps for each UCA type containing the LTL formulas for each control action.
 * @param states The states of the SBM.
 */
function addTransitions(
    maps: {
        notProvidedMap: Map<string, LTLFormula[]>;
        providedMap: Map<string, LTLFormula[]>;
        appliedTooLongMap: Map<string, LTLFormula[]>;
        stoppedTooSoonMap: Map<string, LTLFormula[]>;
    },
    states: State[]
): State[] {
    addNotProvidedTransitions(maps.notProvidedMap, states);
    addProvidedTransitions(maps.providedMap, states);
    states = addAppliedTooLongTransitions(maps.appliedTooLongMap, states);
    states = addStoppedTooSoonTransitions(maps.stoppedTooSoonMap, states);
    return states;
}

/**
 * Adds transitions to the {@code states} such that the ltl Formulas in {@code notProvidedMap} are respected.
 * @param notProvidedMap The LTL formulas with UCA type not-provided/too-late for each control action.
 * @param states The states of the SBM.
 */
function addNotProvidedTransitions(notProvidedMap: Map<string, LTLFormula[]>, states: State[]): void {
    for (const controlAction of notProvidedMap.keys()) {
        const controlActionStateIndex = states.findIndex(state => state.name === controlAction);
        const controlActionState = states[controlActionStateIndex];
        states.forEach((state, index) => {
            if (index !== controlActionStateIndex) {
                // transition from all other states to the controlaction state
                notProvidedMap.get(controlAction)?.forEach(ltlFormula => {
                    // prevent duplicates
                    const sameTransition = state.transitions.find(
                        transition =>
                            transition.target === controlActionState.name &&
                            transition.trigger === ltlFormula.contextVariables
                    );
                    if (sameTransition === undefined) {
                        // add transition
                        const transition = {
                            target: controlActionState.name,
                            trigger: ltlFormula.contextVariables,
                        };
                        state.transitions.push(transition);
                    }
                });
            }
        });
    }
}

/**
 * Adds transitions to the {@code states} such that the ltl Formulas in {@code providedMap} are respected.
 * @param providedMap The LTL formulas with UCA type provided for each control action.
 * @param states The states of the SBM.
 */
function addProvidedTransitions(providedMap: Map<string, LTLFormula[]>, states: State[]): void {
    for (const controlAction of providedMap.keys()) {
        const controlActionState = states.find(state => state.name === controlAction);
        if (controlActionState) {
            providedMap.get(controlAction)?.forEach(ltlFormula => {
                // only add a transition if there not already exists one with the same trigger
                // trigger still may be a subset of another trigger -> set priority or trigger accordingly
                const sameTrigger = controlActionState.transitions.find(
                    transition => transition.trigger === ltlFormula.contextVariables
                );
                if (sameTrigger === undefined) {
                    // transition from controlaction state to the empty state
                    const transition = {
                        target: EMPTY_STATE_NAME,
                        trigger: ltlFormula.contextVariables,
                    };
                    controlActionState.transitions.push(transition);
                }
            });
        }
    }
}

/**
 * Adds transitions to the {@code states} such that the ltl Formulas in {@code appliedTooLongMap} are respected.
 * @param appliedTooLongMap The LTL formulas with UCA type applied-too-long for each control action.
 * @param states The states of the SBM.
 */
function addAppliedTooLongTransitions(appliedTooLongMap: Map<string, LTLFormula[]>, states: State[]): State[] {
    for (const controlAction of appliedTooLongMap.keys()) {
        const controlActionState = states.find(state => state.name === controlAction);
        if (controlActionState) {
            appliedTooLongMap.get(controlAction)?.forEach(ltlFormula => {
                const duplicateState = createDuplicateState(states, controlActionState, ltlFormula);
                states.push(duplicateState);
                // transition to initial state
                // TODO: check existing transitions to decide whether this transition is needed or already covered
                duplicateState.transitions.push({
                    target: EMPTY_STATE_NAME,
                    trigger: `!(${ltlFormula.contextVariables})`,
                });
            });
        }
    }
    return states;
}

/**
 * Adds transitions to the {@code states} such that the ltl formulas in {@code stoppedTooSoonMap} are respected.
 * @param stoppedTooSoonMap The LTL formulas with UCA type stopped-too-soon for each control action.
 * @param states The states of the SBM.
 */
function addStoppedTooSoonTransitions(stoppedTooSoonMap: Map<string, LTLFormula[]>, states: State[]): State[] {
    for (const controlAction of stoppedTooSoonMap.keys()) {
        const controlActionState = states.find(state => state.name === controlAction);
        if (controlActionState) {
            const newlyCreatedStates: Set<{ state: State; formula: LTLFormula }> = new Set();
            stoppedTooSoonMap.get(controlAction)?.forEach(ltlFormula => {
                // there may be already a duplicate state created because of applied-too-long
                let duplicateState = states.find(state => state.name === getStateName(controlAction, ltlFormula));
                // create duplicate state if it does not exist
                if (duplicateState === undefined) {
                    duplicateState = createDuplicateState(states, controlActionState, ltlFormula);
                    newlyCreatedStates.add({ state: duplicateState, formula: ltlFormula });
                    states.push(duplicateState);
                }
                // adjust trigger of outgoing transitions
                duplicateState.transitions.forEach(transition => {
                    if (transition.trigger) {
                        const newTrigger = adjustTrigger(transition.trigger, ltlFormula);
                        if (newTrigger.modify) {
                            transition.trigger =
                                transition.trigger + ` && !(${newTrigger.equationsToAdd.join(" && ")})`;
                        }
                    }
                });
            });
            // add transitions from the newly created duplicate states to other duplicate states by copying
            // and adjusting the transitions from the original control action state to the duplicate states
            newlyCreatedStates.forEach(duplicateState => {
                copyAndAdjustTransitionsToDuplicates(controlActionState, duplicateState.state, duplicateState.formula);
            });
        }
    }
    return states;
}

/**
 * Determines which equations need to be added to the {@code trigger}.
 * The ones that are always false when the {@code trigger} is true are removed.
 * When one of the equations is always true when the {@code trigger} is true, the {@code trigger} is not modified.
 * @param trigger The trigger to adjust.
 * @param ltlFormula The LTL formula that contains the equations to add.
 * @returns whether the {@code trigger} needs to be modified at all and the equations that need to be added.
 */
function adjustTrigger(trigger: string, ltlFormula: LTLFormula): { modify: boolean; equationsToAdd: string[] } {
    const contextVariables = ltlFormula.contextVariables.split("&&");
    const originTrigger = trigger.split("&& !(")[0];
    let modifyTriggerToOriginalState = true;
    const equationsForTriggerToOriginal: string[] = [];
    contextVariables.forEach(variable => {
        const variableEquation = variable.trim();
        const negatedVariableEquation = negateFormula(variableEquation);
        const originTriggerContainsNegatedEquation = isEquationAlreadyContained(originTrigger, negatedVariableEquation);

        if (originTriggerContainsNegatedEquation) {
            // this would mean '!(contextVariables)' is always true when the original trigger is true, hence we do not need to add this
            modifyTriggerToOriginalState = false;
        } else if (modifyTriggerToOriginalState && !isEquationAlreadyContained(trigger, variableEquation)) {
            // if the original trigger does not contain the equation (this would mean !variableEquation cannot be true when original trigger is true), add it
            equationsForTriggerToOriginal.push(variableEquation);
        }
    });
    return { modify: modifyTriggerToOriginalState, equationsToAdd: equationsForTriggerToOriginal };
}

/**
 * Copies the outgoing transitions of {@code originalState} to duplicate states, adjusts the triggers,
 * and adds these transitions to {@code duplicateState}.
 * @param originalState The state from which the transitions should be copied.
 * @param duplicateState The state to which the copied transitions should be added.
 * @param ltlFormula The LTL formula that triggered the creation of the duplicate state.
 */
function copyAndAdjustTransitionsToDuplicates(
    originalState: State,
    duplicateState: State,
    ltlFormula: LTLFormula
): void {
    originalState.transitions.forEach(transition => {
        if (transition.target !== duplicateState.name && transition.target.startsWith(originalState.name + "_")) {
            const newTransition = {
                target: transition.target,
                trigger: transition.trigger + ` && !(${ltlFormula.contextVariables})`,
                effect: transition.effect,
            };
            duplicateState.transitions.push(newTransition);
        }
    });
}

/**
 * Creates a duplicate state for the {@code originalState} by adjusting the incoming edges,
 * copying the outgoing edges and adding a transition from the {@code originalState} to the duplicate.
 * @param states A list of all states of the SBM.
 * @param originalState The state for which a duplicate state should be created.
 * @param ltlFormula The LTL formula that triggered the creation of a duplicate state.
 * @returns a duplicate state for the {@code originalState}.
 */
function createDuplicateState(states: State[], originalState: State, ltlFormula: LTLFormula): State {
    // create state
    const duplicateState: State = {
        name: getStateName(originalState.name, ltlFormula),
        label: `${originalState.name} (${ltlFormula.contextVariables})`,
        controlAction: originalState.controlAction,
        transitions: [],
    };
    // create incoming transitions for the duplicate state
    copyAndAdjustIncomingTransitions(states, originalState, duplicateState, ltlFormula);
    // copy outgoing transitions from controlaction state
    duplicateState.transitions = copyOutgoingTransitions(originalState);
    // transition from controlaction state to the duplicate state
    originalState?.transitions.push({ target: duplicateState.name, trigger: ltlFormula.contextVariables });
    return duplicateState;
}

/**
 * Copies the outgoing transitions from the {@code originalState} and returns them.
 * @param originalState The state from which the outgoing transitions should be copied.
 * @returns a list containing duplicates of the outgoing transitions of the {@code originalState}.
 */
function copyOutgoingTransitions(originalState: State): Transition[] {
    // copy outgoing transitions from original state
    // transitions that are going to other duplicate states should not be copied!
    const duplicateTransitions: Transition[] = [];
    originalState.transitions.forEach(transition => {
        if (!transition.target.startsWith(originalState.name + "_")) {
            duplicateTransitions.push({
                target: transition.target,
                trigger: transition.trigger,
                effect: transition.effect,
            });
        }
    });
    return duplicateTransitions;
}

/**
 * Copies and adjusts the incoming transitions of the {@code originalState}.
 * @param states The list of all states of the SBM.
 * @param originalState The state for which the incoming transitions should be copied and adjusted.
 * @param duplicateState The duplicate state which should get the copied incoming transitions.
 * @param ltlFormula The LTL formula that triggered the creation of a duplicate state.
 */
function copyAndAdjustIncomingTransitions(
    states: State[],
    originalState: State,
    duplicateState: State,
    ltlFormula: LTLFormula
): void {
    states.forEach(state => {
        const transitionsToDuplicate: Transition[] = [];
        const transitionsToCA = state.transitions.filter(transition => transition.target === originalState.name);
        const deletTransitions: Transition[] = [];
        transitionsToCA.forEach(transition => {
            if (transition.trigger) {
                const newTriggers = createNewTriggersForIncomingTransitions(transition.trigger, ltlFormula);
                // transition to duplicate state
                if (newTriggers.duplicateTrigger !== "false") {
                    transitionsToDuplicate.push({
                        target: duplicateState.name,
                        trigger: newTriggers.duplicateTrigger,
                        effect: transition.effect,
                    });
                }
                // adjust trigger of original transition
                if (newTriggers.originalTrigger !== "false") {
                    transition.trigger = newTriggers.originalTrigger;
                } else {
                    deletTransitions.push(transition);
                }
            }
        });
        state.transitions = state.transitions.filter(transition => !deletTransitions.includes(transition));
        state.transitions = state.transitions.concat(transitionsToDuplicate);
    });
}

/**
 * Creates new triggers for incoming transitions of an original state and its duplicate.
 * @param trigger The original trigger.
 * @param ltlFormula The formula that triggered the creation of the duplicate state.
 * @returns new triggers for the incoming transitions of the original state and the duplicate state.
 */
function createNewTriggersForIncomingTransitions(
    trigger: string,
    ltlFormula: LTLFormula
): { originalTrigger: string; duplicateTrigger: string } {
    // we must ignore the negated equations we added to the trigger because of applied-too-long states
    const originTrigger = trigger.split("&& !(")[0];
    let triggerToOriginalState = originTrigger;
    let triggerToDuplicateState = trigger;
    // the context variables of the ltl formula are connected by logical ands
    const contextVariables = ltlFormula.contextVariables.split("&&");
    const equationsForTriggerToOriginal: string[] = [];
    let modifyTriggerToOriginalState = true;
    contextVariables.forEach(variable => {
        const variableEquation = variable.trim();
        const negatedVariableEquation = negateFormula(variableEquation);
        const originTriggerContainsNegatedEquation = isEquationAlreadyContained(originTrigger, negatedVariableEquation);
        // we would want to add ` && variableEquation`, hence if the negated equation is already contained the trigger always evaluates to false
        if (originTriggerContainsNegatedEquation) {
            triggerToDuplicateState = "false";
        } else if (
            triggerToDuplicateState !== "false" &&
            !isEquationAlreadyContained(originTrigger, variableEquation)
        ) {
            triggerToDuplicateState += ` && ${variableEquation}`;
        }
        if (originTriggerContainsNegatedEquation) {
            // this would mean '!(contextVariables)' is always true when the original trigger is true, hence we do not need to add this
            modifyTriggerToOriginalState = false;
        } else if (modifyTriggerToOriginalState && !isEquationAlreadyContained(trigger, variableEquation)) {
            // if the original trigger does not contain the equation (this would mean !variableEquation cannot be true when original trigger is true), add it
            equationsForTriggerToOriginal.push(variableEquation);
        }
    });
    if (modifyTriggerToOriginalState) {
        if (equationsForTriggerToOriginal.length === 0) {
            // if original was not modified, this means '!(contextVariables)' is always false and hence the new trigger as well
            triggerToOriginalState = "false";
        } else {
            triggerToOriginalState += ` && !(${equationsForTriggerToOriginal.join(" && ")})`;
        }
    }

    return { originalTrigger: triggerToOriginalState, duplicateTrigger: triggerToDuplicateState };
}

/**
 * Checks whether the {@code trigger} already contains the {@code variableEquation}.
 * @param trigger The trigger to check whether {@code variableEquation} is contained.
 * @param variableEquation The variable equation to check.
 * @returns whether the {@code trigger} already contains the {@code variableEquation}.
 */
function isEquationAlreadyContained(trigger: string, variableEquation: string): boolean {
    return trigger.includes(variableEquation) && !trigger.includes(`!${variableEquation}`);
}

/**
 * Collects the reachable states of the SBM (including the initial one).
 * @param states The states of the SBM.
 * @returns the reachable states of the SBM (including the initial one).
 */
function filterReachableStates(states: State[]): State[] {
    const reachableStates: State[] = [];
    states.forEach(state => {
        if (state.name === EMPTY_STATE_NAME) {
            reachableStates.push(state);
        } else if (
            states.find(
                otherState =>
                    otherState.name !== state.name &&
                    otherState.transitions.find(transition => transition.target === state.name)
            )
        ) {
            reachableStates.push(state);
        }
    });
    return reachableStates;
}

/**
 * Creates a unique name for a state.
 * @param controlAction The control action the state belongs to.
 * @param ltlFormula The ltl formula for which the state is created.
 * @returns a unique name for a state.
 */
function getStateName(controlAction: string, ltlFormula: LTLFormula): string {
    return controlAction + "_" + ltlFormula.contextVariables.replace(/\.|>=|<=|<|>|!=|==|!|&&|\|\||\s/g, translate);
}

/**
 * Negates the given {@code formula}.
 * @param formula The formula to negate.
 * @returns the negated formula.
 */
function negateFormula(formula: string): string {
    const negatedFormula = formula.replace(/!|>=|<=|<|>|!=|==|&&|\|\|/g, negateOperator);
    if (negatedFormula === formula) {
        return "!" + formula;
    } else {
        return negatedFormula;
    }
}

/**
 * Negates the given operator.
 * @param text The operator to negate.
 */
function negateOperator(text: string): string {
    switch (text) {
        case "<":
            return ">=";
        case "<=":
            return ">";
        case ">":
            return "<=";
        case ">=":
            return "<";
        case "==":
            return "!=";
        case "!=":
            return "==";
        case "&&":
            return "||";
        case "||":
            return "&&";
        case "!":
            return "";
        default:
            return text;
    }
}

/**
 * Translates the given text to a valid state name.
 * @param text The text to translate.
 * @returns a valid state name.
 */
function translate(text: string): string {
    switch (text) {
        case ".":
            return "_";
        case "<":
            return "LessThan";
        case "<=":
            return "LessOrEqualTo";
        case ">":
            return "GreaterThan";
        case ">=":
            return "GreaterOrEqualTo";
        case "==":
            return "EqualTo";
        case "!=":
            return "NotEqualTo";
        case "&&":
            return "And";
        case "||":
            return "Or";
        case "!":
            return "Not";
        case " ":
            return "";
        default:
            return text;
    }
}
