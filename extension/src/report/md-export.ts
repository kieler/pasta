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

import dayjs from "dayjs";
import * as vscode from "vscode";
import { StpaLspVscodeExtension } from "../language-extension";
import { UCA_TYPE, createFile } from "../utils";
import {
    COMPLETE_GRAPH_PATH,
    CONTROLLER_CONSTRAINT_PATH,
    CONTROL_STRUCTURE_PATH,
    FILTERED_CONTROLLER_CONSTRAINT_PATH,
    FILTERED_SCENARIO_PATH,
    FILTERED_UCA_PATH,
    HAZARD_PATH,
    Headers,
    RESPONSIBILITY_PATH,
    SAFETY_REQUIREMENT_PATH,
    SCENARIO_PATH,
    SCENARIO_WITH_HAZARDS_PATH,
    SIZE_MULTIPLIER,
    SVG_PATH,
    SYSTEM_CONSTRAINT_PATH,
    StpaComponent,
    StpaResult,
    UCA_PATH,
} from "./utils";

/**
 * Creates a markdown file for the given {@code data}.
 * @param data The STPA result for which the markdown file should be created.
 * @param extension The PASTA extension.
 * @returns
 */
export async function createSTPAResultMarkdownFile(data: StpaResult, extension: StpaLspVscodeExtension): Promise<void> {
    // Ask the user where to save the markdown file
    const currentFolder = vscode.workspace.workspaceFolders
        ? vscode.workspace.workspaceFolders[0].uri.fsPath
        : undefined;
    const uri = await vscode.window.showSaveDialog({
        filters: { Markdown: ["md"] },
        // TODO: not possible with current vscode version
        // title: 'Save Markdown to...',
        defaultUri: currentFolder ? vscode.Uri.file(`${currentFolder}/report.md`) : undefined,
    });
    if (uri === undefined) {
        // The user did not pick any file to save to.
        return;
    }

    // create svg diagrams and save their width
    const diagramSizes: Record<string, number> = await extension.createSVGDiagrams(
        uri.path.substring(0, uri.path.lastIndexOf("/")) + SVG_PATH
    );

    // create the markdown text
    const markdown = createSTPAResultMarkdownText(data, diagramSizes);
    // create the file
    createFile(uri.path, markdown);
}

/**
 * Creates the markdown text for the given {@code data}.
 * @param data The STPA result for which the text should be created.
 * @param diagramSizes The widths of the diagrams that will be embedded.
 * @returns markdown text for the given {@code data}
 */
function createSTPAResultMarkdownText(data: StpaResult, diagramSizes: Record<string, number>): string {
    let markdown = `# STPA Report for ${data.title}\n\n`;
    // table of contents
    markdown += createTOC() + "\n";
    // goals
    markdown += stpaAspectToMarkdown(Headers.Goal, data.goals) + "\n";
    // assumptions
    markdown += stpaAspectToMarkdown(Headers.Assumption, data.assumptions) + "\n";
    // losses
    markdown += stpaAspectToMarkdown(Headers.Loss, data.losses) + "\n";
    // hazards
    markdown += stpaAspectToMarkdown(Headers.Hazard, data.hazards, HAZARD_PATH, diagramSizes);
    // system-level constraints
    markdown += stpaAspectToMarkdown(
        Headers.SystemLevelConstraint,
        data.systemLevelConstraints,
        SYSTEM_CONSTRAINT_PATH,
        diagramSizes
    );
    // control structure
    markdown += addControlStructure(diagramSizes);
    // responsibilities
    markdown += recordToMarkdown(data.responsibilities, Headers.Responsibility);
    if (Object.keys(data.responsibilities).length > 0) {
        markdown += `<img src=".${SVG_PATH + RESPONSIBILITY_PATH}" width="${
            diagramSizes[RESPONSIBILITY_PATH] * SIZE_MULTIPLIER
        }">\n\n<br>\n\n`;
    }
    // UCAs
    markdown += ucasToMarkdown(data.ucas, diagramSizes);
    // controller constraints
    markdown += constraintsToMarkdown(Headers.ControllerConstraint, data.controllerConstraints, diagramSizes);
    // loss scenarios
    markdown += scenariosToMarkdown(data.ucaScenarios, data.scenarios, diagramSizes);
    // safety requirements
    markdown += stpaAspectToMarkdown(Headers.SafetyRequirement, data.safetyConstraints, SAFETY_REQUIREMENT_PATH, diagramSizes);
    // summarized safety constraints
    markdown += addSummary(data, diagramSizes);
    // copyright
    markdown += addCopyRight();
    return markdown;
}

/**
 * Translates an STPA aspect to markdown text.
 * @param aspect The header for the aspect to translate.
 * @param components The components of the aspect to translate.
 * @param svgName The name of the diagram that should be embedded.
 * @param diagramSizes The widths of the diagrams that should be embedded.
 * @returns the markdown text for the given aspect and its components.
 */
function stpaAspectToMarkdown(
    aspect: string,
    components: StpaComponent[],
    svgName?: string,
    diagramSizes?: Record<string, number>
): string {
    let markdown = `## ${aspect}\n\n`;
    if (components.length === 0) {
        // extra text if no components are defined.
        markdown += `No ${aspect} defined.\n`;
    } else {
        // translate each component
        for (const component of components) {
            markdown += stpaComponentToMarkdown(component) + `  \n`;
            if (component.subComponents) {
                // translate the subcomponents of hazards/system-level constraints
                markdown += subComponentsToMarkdown(component.subComponents, "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;");
            }
        }
        // add the diagram if one is given
        if (svgName && diagramSizes) {
            markdown += `\n<img src=".${SVG_PATH + svgName}" width="${
                diagramSizes[svgName] * SIZE_MULTIPLIER
            }">\n\n<br>\n\n`;
        }
    }
    return markdown;
}

/**
 * Translates subcomponents (of Hayards/system-level constraints) to markdown.
 * @param components The components to translate.
 * @param tabs The current indentation.
 * @returns the markdown text for the given {@code components}.
 */
function subComponentsToMarkdown(components: StpaComponent[], tabs: string): string {
    let markdown = "";
    for (const component of components) {
        // translate component
        markdown += `${tabs} **${component.id}**: ${component.description}   \n`;
        if (component.subComponents) {
            // translate further subcomponents
            markdown += subComponentsToMarkdown(component.subComponents, tabs + "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;");
        }
    }
    return markdown;
}

/**
 * Translates a single UCA to markdown.
 * @param component The UCA to translate.
 * @returns the markdown text for the given UCA.
 */
function ucaComponentToMarkdown(component: StpaComponent): string {
    let markdown = `<b>${component.id}</b>: ${component.description}`;
    if (component.references !== undefined && component.references !== "") {
        markdown += ` [${component.references}]`;
    }
    return markdown;
}

/**
 * Translates a single STPA component to markdown.
 * @param component The component to translate.
 * @returns the markdown text for the given {@code component}.
 */
function stpaComponentToMarkdown(component: StpaComponent): string {
    // Translation form: "**ID**: description [Refs]"
    let markdown = `**${component.id}**: ${component.description}`;
    // not all components have references
    if (component.references !== undefined && component.references !== "") {
        markdown += ` [${component.references}]`;
    }
    return markdown;
}

/**
 * Translates a record (responsibilities/loss scenarios) to markdown.
 * @param aspect The header of the aspect to translate.
 * @param data The data to translate.
 * @returns the markdown text for the given {@code data}.
 */
function recordToMarkdown(data: Record<string, StpaComponent[]>, aspect?: string): string {
    let markdown = ``;
    if (aspect) {
        markdown += `## ${aspect}\n\n`;
        if (Object.keys(data).length === 0) {
            // extra text if no component is defined
            markdown += `No ${aspect} defined.\n`;
            return markdown;
        }
    }
    for (const reference in data) {
        // the components are grouped by their keys
        markdown += `_${reference}_  \n`;
        // translate the components
        for (const component of data[reference]) {
            markdown += stpaComponentToMarkdown(component);
            markdown += `  \n`;
        }
        markdown += `\n`;
    }

    return markdown;
}

/**
 * Translates loss scenarios to markdown.
 * @param ucaScenarios The scenarios with reference to an UCA.
 * @param scenarios The scenarios without a reference to an UCA.
 * @param diagramSizes The widths of the diagrams to include.
 * @returns the markdown text for the given scenarios.
 */
function scenariosToMarkdown(
    ucaScenarios: Record<string, Record<string, StpaComponent[]>>,
    scenarios: StpaComponent[],
    diagramSizes: Record<string, number>
): string {
    // translate the uca scenarios
    let markdown = `## ${Headers.LossScenario}\n\n`;
    markdown += `### Scenarios with associated UCA\n\n`;
    for (const key of Object.keys(ucaScenarios)) {
        markdown += `#### _${key}_\n\n`;
        markdown += recordToMarkdown(ucaScenarios[key]) + "\n";
        // add the filtered diagram for the control action
        const path = FILTERED_SCENARIO_PATH(key);
        markdown += `<img src=".${SVG_PATH + path}" width="${diagramSizes[path] * SIZE_MULTIPLIER}">\n\n<br>\n\n`;
    }

    // translate the other scenarios
    if (scenarios.length !== 0) {
        markdown += `### Scenarios without associated UCA\n\n`;
        markdown += scenarios.map((scenario) => stpaComponentToMarkdown(scenario)).join("  \n") + `\n\n`;
        markdown += `<img src=".${SVG_PATH + SCENARIO_WITH_HAZARDS_PATH}" width="${
            diagramSizes[SCENARIO_WITH_HAZARDS_PATH] * SIZE_MULTIPLIER
        }">\n\n`;
    }

    // add the diagram for all scenarios
    markdown += `### All Scenarios\n\n`;
    markdown += `<img src=".${SVG_PATH + SCENARIO_PATH}" width="${
        diagramSizes[SCENARIO_PATH] * SIZE_MULTIPLIER
    }">\n\n<br>\n\n`;
    return markdown;
}

/**
 * Translates the UCAs to a markdown table.
 * @param actionUcas The UCAs to translate.
 * @param diagramSizes The widths of the diagrams to include.
 * @returns the markdown table for the UCAs.
 */
function ucasToMarkdown(
    actionUcas: Record<string, Record<string, StpaComponent[]>>,
    diagramSizes: Record<string, number>
): string {
    let markdown = `## ${Headers.UCA}\n\n`;
    for (const actionUCA of Object.keys(actionUcas)) {
        // for each control action a table is generated
        markdown += `### _${actionUCA}_\n\n`;
        // header of the table containing the UCA types
        markdown += `<table border="1px"  border-collapse="collapse">\n<tr>\n<th>not provided</th>\n<th>provided</th>\n<th>too late or too early</th>\n<th>applied too long or stopped too soon</th>\n</tr>\n`;
        markdown += "<tr><td>\n";
        // add not provided UCAs
        markdown += actionUcas[actionUCA][UCA_TYPE.NOT_PROVIDED]
            ?.map((uca) => ucaComponentToMarkdown(uca))
            .join("<br><br>");
        markdown += "</td>\n<td>\n";
        // add provided UCAs
        markdown += actionUcas[actionUCA][UCA_TYPE.PROVIDED]
            ?.map((uca) => ucaComponentToMarkdown(uca))
            .join("<br><br>");
        markdown += "</td>\n<td>\n";
        // add wrong timing UCAs
        markdown += actionUcas[actionUCA][UCA_TYPE.WRONG_TIME]
            ?.map((uca) => ucaComponentToMarkdown(uca))
            .join("<br><br>");
        markdown += "</td>\n<td>\n";
        // add continous UCAs
        markdown += actionUcas[actionUCA][UCA_TYPE.CONTINUOUS]
            ?.map((uca) => ucaComponentToMarkdown(uca))
            .join("<br><br>");
        markdown += "</td>\n</tr>\n</table>\n\n<br>\n\n";
        // add the filtered diagram for the control action
        const path = FILTERED_UCA_PATH(actionUCA);
        markdown += `<img src=".${SVG_PATH + path}" width="${diagramSizes[path] * SIZE_MULTIPLIER}">\n\n<br>\n\n`;
    }
    // add a diagram for all UCAs
    markdown += `### _All UCAs_\n\n`;
    markdown += `<img src=".${SVG_PATH + UCA_PATH}" width="${diagramSizes[UCA_PATH] * SIZE_MULTIPLIER}">\n\n<br>\n\n`;
    return markdown;
}

function constraintsToMarkdown(
    header: string,
    constraints: Record<string, StpaComponent[]>,
    diagramSizes: Record<string, number>
): string {
    let markdown = `## ${header}\n\n`;
    if (Object.keys(constraints).length === 0) {
        // extra text if no component is defined
        markdown += `No constraints defined.\n`;
    }
    for (const key of Object.keys(constraints)) {
        markdown += `### _${key}_\n\n`;
        markdown += constraints[key].map((constraint) => stpaComponentToMarkdown(constraint)).join("  \n") + "\n";
        const path = FILTERED_CONTROLLER_CONSTRAINT_PATH(key);
        markdown += `\n<img src=".${SVG_PATH + path}" width="${diagramSizes[path] * SIZE_MULTIPLIER}">\n\n`;
    }
    // add a diagram for all constraints
    markdown += `### _All Controller Constraints_\n\n`;
    markdown += `<img src=".${SVG_PATH + CONTROLLER_CONSTRAINT_PATH}" width="${
        diagramSizes[CONTROLLER_CONSTRAINT_PATH] * SIZE_MULTIPLIER
    }">\n\n<br>\n\n`;
    return markdown;
}

/**
 * Adds a summary of the defined constraints.
 * @param data The STPA result data.
 * @param diagramSizes The widths of the diagrams to include.
 * @returns the markdown text for the summary of the defined constraints.
 */
function addSummary(data: StpaResult, diagramSizes: Record<string, number>): string {
    let markdown = `## ${Headers.Summary}\n\n`;
    // add system-level constraints
    for (const component of data.systemLevelConstraints) {
        markdown += stpaComponentToMarkdown(component);
        markdown += `  \n`;
    }
    // add controller constraints
    for (const key of Object.keys(data.controllerConstraints)) {
        for (const component of data.controllerConstraints[key]) {
            markdown += stpaComponentToMarkdown(component);
            markdown += `  \n`;
        }
    }
    // add safety constraints
    for (const component of data.safetyConstraints) {
        markdown += stpaComponentToMarkdown(component);
        markdown += `  \n`;
    }
    // add a diagram of the whole diagram
    markdown += `\n\n<img src=".${SVG_PATH + COMPLETE_GRAPH_PATH}" width="${
        diagramSizes[COMPLETE_GRAPH_PATH] * SIZE_MULTIPLIER
    }">\n\n`;
    return markdown;
}

/**
 * Creates the markdown text to include the control structure diagram.
 * @param diagramSizes The witdhs of the diagrams to include.
 * @returns the markdown text to include the control structure diagram.
 */
function addControlStructure(diagramSizes: Record<string, number>): string {
    let markdown = `## ${Headers.ControlStructure}\n\n`;
    markdown += `<img src=".${SVG_PATH + CONTROL_STRUCTURE_PATH}" width="${
        diagramSizes[CONTROL_STRUCTURE_PATH] * SIZE_MULTIPLIER
    }">\n\n<br>\n\n`;
    return markdown;
}

/**
 * Creates a copyright for the markdown file.
 * @returns the copyright for the markdown file.
 */
function addCopyRight(): string {
    const markdown =
        "<br><br>\n\nSTPA Report generated by PASTA, " +
        dayjs().format("YYYY-MM-DD HH:mm:ss") +
        " (https://github.com/kieler/stpa)";
    return markdown;
}

/**
 * Creates a table of contents for the markdown file.
 * @returns markdown text for the table of contents.
 */
function createTOC(): string {
    //TODO: use regex for the whitespace
    let markdown = "## Table of Contents\n\n";
    markdown += `1. [${Headers.Goal}](#${Headers.Goal.toLowerCase()})\n`;
    markdown += `2. [${Headers.Assumption}](#${Headers.Assumption.toLowerCase()})\n`;
    markdown += `3. [${Headers.Loss}](#${Headers.Loss.toLowerCase()})\n`;
    markdown += `4. [${Headers.Hazard}](#${Headers.Hazard.toLowerCase()})\n`;
    markdown += `5. [${Headers.SystemLevelConstraint}](#${Headers.SystemLevelConstraint.toLowerCase().replace(
        " ",
        "-"
    )})\n`;
    markdown += `6. [${Headers.ControlStructure}](#${Headers.ControlStructure.toLowerCase().replace(" ", "-")})\n`;
    markdown += `7. [${Headers.Responsibility}](#${Headers.Responsibility.toLowerCase()})\n`;
    markdown += `8. [${Headers.UCA}](#${Headers.UCA.toLowerCase()})\n`;
    markdown += `9. [${Headers.ControllerConstraint}](#${Headers.ControllerConstraint.toLowerCase().replace(
        " ",
        "-"
    )})\n`;
    markdown += `10. [${Headers.LossScenario}](#${Headers.LossScenario.toLowerCase().replace(" ", "-")})\n`;
    markdown += `11. [${Headers.SafetyRequirement}](#${Headers.SafetyRequirement.toLowerCase().replace(" ", "-")})\n`;
    markdown += `12. [${Headers.ControllerConstraint}](#${Headers.ControllerConstraint.toLowerCase().replace(
        " ",
        "-"
    )})\n`;
    markdown += `13. [${Headers.Summary}](#${Headers.Summary.toLowerCase().replace(" ", "-").replace(" ", "-")})\n`;
    return markdown;
}
