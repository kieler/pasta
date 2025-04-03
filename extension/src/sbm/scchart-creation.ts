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

import { EMPTY_STATE_NAME, Enum, LTLFormula, State, Variable } from "./utils";

/**
 * Creates the text for an scchart based on the given arguments.
 * @param controllerName The name of the controller that is modelled.
 * @param states The states the scchart should contain.
 * @param variables The variables the scchart needs.
 * @param enums The enums the scchart needs.
 * @param ltlFormulas The ltl formulas that should be contained.
 * @param controlActions The control actions which will be modelled as an enum.
 * @returns The text for an scchart.
 */
export function createSCChartText(
    controllerName: string,
    states: State[],
    variables: Variable[],
    enums: Enum[],
    ltlFormulas: LTLFormula[],
    controlActions: string[]
): string {
    let result = "";
    // ltl annotations at the top
    ltlFormulas.forEach((LTLFormula) => (result += createLTLAnnotation(LTLFormula)));
    // name of the acchart must be different to the enum name
    result += `scchart SBM_${controllerName} {\n\n`;
    // enum for the control action
    result += createEnum(controllerName, controlActions);
    // other enums
    enums.forEach((enumDeclaration) => (result += createEnum(enumDeclaration.name, enumDeclaration.values)));
    // variables and states
    // TODO: AssumeRange annotation for variables?
    result += createVariables(variables);
    result += createStates(states, controllerName);
    result += "}";
    return result;
}

/**
 * Creates an ltl annotaiton for {@code ltlFormula}.
 * @param ltlFormula The ltlFormula that should be translated to an ltl annotation.
 * @returns an ltl annotation for the {@code ltlFormula}.
 */
function createLTLAnnotation(ltlFormula: LTLFormula): string {
    return `@LTL "${ltlFormula.formula}", "${ltlFormula.description}", "${ltlFormula.ucaId}" \n`;
}

/**
 * Creates an enum with the given {@code enumName} and its {@code values}.
 * @param enumName The name of the enum.
 * @param values The values the enum should contain.
 * @returns an enum declaration with the given {@code enumName} and its {@code values}.
 */
function createEnum(enumName: string, values: string[]): string {
    let enumDeclaration = `enum ${enumName} {`;
    values.forEach((controlAction, index) => {
        enumDeclaration += controlAction;
        if (index < values.length - 1) {
            enumDeclaration += ", ";
        }
    });
    enumDeclaration += "}\n";
    return enumDeclaration;
}

/**
 * Creates variable declarations for the given {@code variables}.
 * @param variables The variables for which declarations should be created.
 * @returns variable declarations for the given {@code variables}.
 */
function createVariables(variables: Variable[]): string {
    let variableDeclarations = "";
    variables.forEach((variable) => {
        if (variable.input) {
            variableDeclarations += "input ";
        } else if (variable.output) {
            variableDeclarations += "output ";
        }
        variableDeclarations += `${variable.type} ${variable.name}\n`;
    });
    return variableDeclarations + "\n";
}

/**
 * Create SCChart states for the given {@states}.
 * @param states The states which should be translated to SCChart states.
 * @param enumName The name of the controlAction enum.
 * @returns SCChart states for the given {@states}.
 */
function createStates(states: State[], enumName: string): string {
    let stateDeclarations = "";
    states.forEach((state) => {
        // the empty state is the initial one
        if (state.name === EMPTY_STATE_NAME) {
            stateDeclarations += "initial ";
        }
        stateDeclarations += `state ${state.name}`;
        if (state.label) {
            stateDeclarations += ` "${state.label}"`;
        }
        stateDeclarations += ` {\n`;
        // each state should hava a control action which is set when entering the state
        if (state.controlAction !== "") {
            stateDeclarations += `entry do controlAction = ${enumName}.${state.controlAction}\n`;
        }
        stateDeclarations += "}\n";
        // translate transitions
        // the first transition in the list has the highest priority
        state.transitions.forEach((transition) => {
            if (transition.trigger) {
                stateDeclarations += `if ${transition.trigger} `;
            }
            if (transition.effect) {
                stateDeclarations += `do ${transition.effect} `;
            }
            stateDeclarations += `go to ${transition.target}\n`;
        });
        stateDeclarations += "\n";
    });
    return stateDeclarations;
}
