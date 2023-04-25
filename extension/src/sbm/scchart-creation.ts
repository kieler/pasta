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

import * as vscode from 'vscode';
import { EMPTY_STATE_NAME, LTLFormula, State, Variable } from "./utils";

/**
 * Creates the text for an scchart based on the given arguments.
 * @param controllerName The name of the controller that is modelled.
 * @param states The states the scchart should contain.
 * @param variables The variables the scchart needs.
 * @param ltlFormulas The ltl formulas that should be contained.
 * @param controlActions The control actions which will be modelled as an enum.
 * @returns The text for an scchart.
 */
export function createSCChartText(controllerName: string, states: State[], variables: Variable[], ltlFormulas: LTLFormula[], controlActions: string[]): string {
    let result = "";
    // ltl annotations at the top
    ltlFormulas.forEach(LTLFormula => result += createLTLAnnotation(LTLFormula));
    // name of the acchart must be different to the enum name
    result += `scchart SBM_${controllerName} {\n\n`;
    // enum for the control action
    result += createEnum(controllerName, controlActions);
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
    let enumDecl = `enum ${enumName} {`;
    values.forEach((controlAction, index) => {
        enumDecl += controlAction;
        if (index < values.length - 1) { enumDecl += ", "; }
    });
    enumDecl += "}\n";
    return enumDecl;
}

/**
 * Creates variable declarations for the given {@code variables}.
 * @param variables The variables for which declarations should be created.
 * @returns variable declarations for the given {@code variables}.
 */
function createVariables(variables: Variable[]): string {
    let variableDecl = "";
    variables.forEach(variable => {
        variableDecl += `${variable.type} ${variable.name}\n`;
    });
    return variableDecl + "\n";
}

/**
 * Create SCChart states for the given {@states}.
 * @param states The states which should be translated to SCChart states.
 * @param enumName The name of the controlAction enum.
 * @returns SCChart states for the given {@states}.
 */
function createStates(states: State[], enumName: string): string {
    let stateDecl = "";
    states.forEach(state => {
        // the empty state is the initial one
        if (state.name === EMPTY_STATE_NAME) {
            stateDecl += "initial ";
        }
        stateDecl += `state ${state.name} {\n`;
        // each state should hava a control action which is set when entering the state
        if (state.controlAction !== "") {
            stateDecl += `entry do controlAction = ${enumName}.${state.controlAction}\n`;
        }
        stateDecl += "}\n";
        // translate transitions
        // the first transition in the list has the highest priority
        state.transitions.forEach(transition => {
            if (transition.trigger) {
                stateDecl += `if ${transition.trigger} `;
            }
            if (transition.effect) {
                stateDecl += `do ${transition.effect} `;
            }
            stateDecl += `go to ${transition.target}\n`;
        });
        stateDecl += "\n";
    });
    return stateDecl;
}

/**
 * Creates an scchart file with the given {@code uri} containing the {@code text}.
 * @param uri The uri of the file to create.
 * @param text The content of the file.
 * @returns 
 */
export async function createSCChartFile(uri: string, text: string): Promise<void> {
    // TODO: checking for existing file is not working. Document is always undefined
    let doc = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === vscode.Uri.parse(uri).toString());
    const edit = new vscode.WorkspaceEdit();
    // if (doc !== undefined) {
    //     const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(doc.lineCount, 0));
    //     edit.replace(vscode.Uri.parse(uri), range, text);
    // } else {

    // create the file
    edit.createFile(vscode.Uri.parse(uri));
    // insert the content
    const pos = new vscode.Position(0, 0);
    edit.insert(vscode.Uri.parse(uri), pos, text);
    // }
    // Apply the edit. Report possible failures.
    const edited = await vscode.workspace.applyEdit(edit);
    if (!edited) {
        console.error("Workspace edit could not be applied!");
        return;
    }
    // save the edit
    if (doc === undefined) {
        doc = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === vscode.Uri.parse(uri).toString());
    }
    const saved = await doc?.save();
    if (!saved) {
        console.error(`TextDocument ${doc?.uri} could not be saved!`);
        return;
    }
}

