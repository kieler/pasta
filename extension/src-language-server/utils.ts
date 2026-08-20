/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2022-2023 by
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

import { AstNode } from "langium";
import { IdCache, LangiumSprottySharedServices } from "langium-sprotty";
import { LangiumSharedServices } from "langium/lsp";
import { SLabel } from "sprotty-protocol";
import { URI } from "vscode-uri";
import { StpaValidator } from "./stpa/services/stpa-validator.js";
import { labelManagementValue } from "./synthesis-options.js";
import { MarkerDefinition, INLINE_MARKER_DEFINITIONS } from "../src/utils-classes.js";

function escapeForRegexLiteral(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Removes all markdown-style markers that would be hidden by the InlineMarkdownDecorator.
 * @param input The input string with markdown markers
 * @param markerConfigs Optional marker configurations. If not provided, uses the default configs.
 * @returns The string with hidden markers and escape backslashes removed
 */
export function stripInlineMarkers(
    input: string,
    markerConfigs: readonly MarkerDefinition[] = INLINE_MARKER_DEFINITIONS
): string {
    let result = input;

    // Remove marker pairs (Only matches markers that aren't escaped)
    for (const config of markerConfigs) {
        const escapedMarker = escapeForRegexLiteral(config.marker);
        const regex = new RegExp(`(?<!\\\\)(${escapedMarker}+)(.+?)(?<!\\\\)\\1(?!${escapedMarker})`, "g");
        
        result = result.replace(regex, (match, markers, content) => {
            return content;
        });
    }

    // Remove all escape backslashes before markers and backslashes
    const markers = new Set<string>(markerConfigs.map(c => c.marker));
    markers.add("\\");
    
    const alternation = Array.from(markers).map(escapeForRegexLiteral).join("|");
    if (alternation) {
        const escapeRegex = new RegExp(`\\\\(${alternation})`, "g");
        
        result = result.replace(escapeRegex, "$1");
    }
    return result;
}

/**
 * Return the raw inner content of the first STRING token found for the given AST node.
 * @param node The AST node to extract the string from.
 * @returns the inner text (without surrounding quotes) or undefined when not available.
 */
export function getRawStringInnerFromCst(node: any): string | undefined {
    if (!node || !node.$cstNode) {
        return undefined;
    } 

    const cst = node.$cstNode;

    // depth-first search for a leaf token that contains the quoted text
    try {
        const stack: any[] = [cst];
        while (stack.length > 0) {
            const n = stack.pop();
            if (!n) {
                continue;
            }
            
            // If composite node with children, push them
            if (Array.isArray((n as any).children) && (n as any).children.length > 0) {
                for (let i = (n as any).children.length - 1; i >= 0; --i) {
                    stack.push((n as any).children[i]);
                }
                continue;
            }

            const img = (n as any).text ?? undefined;
            if (typeof img === "string" && img.length >= 2) {
                const first = img[0];
                const last = img[img.length - 1];
                if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
                    // return without surrounding quotes
                    return img.substring(1, img.length - 1);
                }
            }
        }
    } catch (e) {
        console.error("Error while extracting raw string inner content:", e);
    }
}

/**
 * Determines the model for {@code uri}.
 * @param uri The URI for which the model is desired.
 * @param shared The shared services.
 * @returns the model for the given uri.
 */
export async function getModel(
    uri: string,
    shared: LangiumSprottySharedServices | LangiumSharedServices
): Promise<AstNode> {
    const textDocuments = shared.workspace.LangiumDocuments;
    const currentDoc = await textDocuments.getOrCreateDocument(URI.parse(uri));
    return currentDoc.parseResult.value;
}

/**
 * Creates a list of labels containing the given {@code description} respecting the {@code labelManagement} and {@code labelWidth}.
 * @param description The text for the label to create.
 * @param labelManagement The label management option.
 * @param labelWidth The desired width of the label.
 * @param nodeId The id of the node for which the label is created.
 * @param idCache The id cache.
 * @returns a list of labels containing the given {@code description} respecting the {@code labelManagement} and {@code labelWidth}.
 */
export function getDescription(
    description: string,
    labelManagement: labelManagementValue,
    labelWidth: number,
    nodeId: string,
    idCache: IdCache<AstNode>
): SLabel[] {
    const labels: SLabel[] = [];
    const words = description.split(" ");
    let current = "";
    switch (labelManagement) {
        case labelManagementValue.NO_LABELS:
            break;
        case labelManagementValue.ORIGINAL:
            // show complete description in one line
            labels.push(<SLabel>{
                type: "label",
                id: idCache.uniqueId(nodeId + "_label"),
                text: description,
            });
            break;
        case labelManagementValue.TRUNCATE:
            // truncate description to the set value
            if (words.length > 0) {
                current = words[0];
                for (let i = 1; i < words.length && current.length + words[i].length <= labelWidth; i++) {
                    current += " " + words[i];
                }
                labels.push(<SLabel>{
                    type: "label",
                    id: idCache.uniqueId(nodeId + "_label"),
                    text: current + "...",
                });
            }
            break;
        case labelManagementValue.WRAPPING:
            // wrap description to the set value
            const descriptions: string[] = [];
            for (const word of words) {
                if (current.length + word.length >= labelWidth) {
                    descriptions.push(current);
                    current = word;
                } else {
                    current += " " + word;
                }
            }
            descriptions.push(current);
            for (let i = descriptions.length - 1; i >= 0; i--) {
                labels.push(<SLabel>{
                    type: "label",
                    id: idCache.uniqueId(nodeId + "_label"),
                    text: descriptions[i],
                });
            }
            break;
    }
    return labels;
}

/**
 * Updates the validation checks for the STPA validator.
 * @param options The validation options.
 * @param validator The STPA validator.
 */
export function updateValidationChecks(options: Record<string, any>, validator: StpaValidator): void {
    // TODO: save options also in record and use them in the validator
    // set options if they are set
    Object.entries(options).forEach(([key, value]) => {
        switch (key) {
            case "checkResponsibilitiesForConstraints":
                validator.checkResponsibilitiesForConstraints = value;
                break;
            case "checkConstraintsForUCAs":
                validator.checkConstraintsForUCAs = value;
                break;
            case "checkScenariosForUCAs":
                validator.checkScenariosForUCAs = value;
                break;
            case "checkSafetyRequirementsForScenarios":
                validator.checkSafetyRequirementsForScenarios = value;
                break;
            case "checkMissingFeedback":
                validator.checkMissingFeedback = value;
                break;
        }
    });
}
