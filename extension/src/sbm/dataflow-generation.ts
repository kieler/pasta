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

import { createDataflowSCChart } from "./scchart-creation";
import { Equation, LTLFormula } from "./utils-classes";
import { askForPath, collectContextVariables, collectControlActionVariables, groupFormulasByActionAndType } from "./sbm-generation";
import { createFile } from '../utils';

export async function createDataflows(
    controlActionsMap: Record<string, string[]>,
    formulaMap: Record<string, LTLFormula[]>,
): Promise<void> {
    for (const controller of Object.keys(controlActionsMap)) {
        await createControllerDataflow(controller, controlActionsMap[controller], formulaMap[controller] ?? []);
    }
}

export async function createControllerDataflow(
    controllerName: string,
    controlActions: string[],
    ltlFormulas: LTLFormula[],
): Promise<void> {
    // Ask the user where to save the sbm
    const uriPath = await askForPath();
    if (uriPath === undefined) {
        // The user did not pick any file to save to.
        return;
    }

    // collect the input variables
    const contextVariables = collectContextVariables(ltlFormulas);
    // collect the output variables
    const outputVariables = collectControlActionVariables(controlActions);
    // equations for each control action
    const equations = createEquations(ltlFormulas, controlActions);

    // create the scchart
    const scchartText = createDataflowSCChart(
        controllerName,
        contextVariables.variables.concat(outputVariables),
        contextVariables.enums,
        ltlFormulas,
        equations
    );

    createFile(uriPath, scchartText);
}

function createEquations(ltlFormulas: LTLFormula[], controlActions: string[]): Equation[] {
    const equations: Equation[] = [];
    // group the formulas by control action and type
    const formulaMap = groupFormulasByActionAndType(ltlFormulas);
    for (const action of controlActions) {
        const eq: Equation = {left: action, right: ""};

        // construct subequation for provided formulas
        const providedFormulas = formulaMap.providedMap.get(action) ?? [];
        let providedSubEquation = "";
        for (let i = 0; i < providedFormulas.length; i++) {
            const formula = providedFormulas[i];
            providedSubEquation += `!(${formula.contextVariables}) `;
            if (i !== providedFormulas.length - 1) {
                providedSubEquation += "&& ";
            }
        }

        // construct subequation for not provided formulas
        const notProvidedFormulas = formulaMap.notProvidedMap.get(action) ?? [];
        let notProvidedSubEquation = "";
        for (let i = 0; i < notProvidedFormulas.length; i++) {
            const formula = notProvidedFormulas[i];
            notProvidedSubEquation += `(${formula.contextVariables}) `;
            if (i !== notProvidedFormulas.length - 1) {
                notProvidedSubEquation += "|| ";
            }
        }

        // combine the two subequations
        if (providedSubEquation !== "") {
            eq.right = `${providedSubEquation} && `;
        }
        eq.right += `(${notProvidedSubEquation})`;
        // if the right side is empty, it means that there are no formulas for this control action, so we don't add an equation for it
        // should normally not happen, but possibly prevents syntactic errors in the generated scchart
        if (eq.right !== "") {
            equations.push(eq);
        }
    }
    return equations;
}