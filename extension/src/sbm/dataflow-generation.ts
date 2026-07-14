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
import { LTLFormula } from "./utils-classes";
import { askForPath, collectContextVariables, collectControlActionVariables } from "./sbm-generation";
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
    // TODO: add equations

    // create the scchart
    const scchartText = createDataflowSCChart(
        controllerName,
        contextVariables.variables.concat(outputVariables),
        contextVariables.enums,
        ltlFormulas,
    );

    createFile(uriPath, scchartText);
}
