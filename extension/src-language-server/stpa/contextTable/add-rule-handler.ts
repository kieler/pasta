import type { Connection } from "vscode-languageserver";
import { URI, type LangiumDocuments } from "langium";
import type { StpaServices } from "../stpa-module.js";
import { AddRuleInput, ContextTableRuleTextBuilder, GeneratedRuleTexts } from "./rule-creation.js";


/**
 * Adds a new rule to the document at the correct position depending on the existing rules.
 * @param msg The message containing the information about the rule to be created.
 * @param stpaServices The services of the STPA language server, needed to access the document and its model.
 * @param connection The connection to the extension, needed to send the text edit to the editor.
 * @returns 
 */
export async function insertRuleFromContextTable(
    msg: {
        sourceUri: string;
        type: string;
        controlAction: { controller: string; action: string };
        varMap: Record<string, string>;
    },
    stpaServices: StpaServices,
    connection: Connection
): Promise<void> {
    const uriString = msg.sourceUri;
    if (!uriString) {
        console.warn("insertRuleFromContextTable: missing sourceUri.");
        return;
    }

    const parsedUri = URI.parse(uriString);

    // Ensure the document is built
    try {
        await stpaServices.shared.workspace.DocumentBuilder.update([parsedUri], []);
    } catch (err) {
        console.warn("insertRuleFromContextTable: DocumentBuilder.update failed for", uriString, err);
    }

    try {
        const langDocs = (stpaServices.shared.workspace as any).LangiumDocuments as LangiumDocuments;
        const langDoc = langDocs?.getDocument(parsedUri);

        if (!langDoc) {
            console.warn("insertRuleFromContextTable: no Langium doc available for", uriString);
            return;
        }

        const builder = new ContextTableRuleTextBuilder(stpaServices as any);
        const document = langDoc.textDocument;
        const model = langDoc.parseResult.value as any;
        const ruleInput: AddRuleInput = {
            type: msg.type,
            controlAction: msg.controlAction,
            varMap: msg.varMap,
        };
        const generated: GeneratedRuleTexts = builder.generate(ruleInput);

        // Default: insert full rule
        let insertText: string = generated.ruleText;
        let insertPosition = { line: 0, character: 0 };

        // If there are existing rules, inspect them for matching controlAction & type
        if (Array.isArray(model?.rules) && model.rules.length > 0) {
            const rules = model.rules;
            const lastRule = rules[rules.length - 1];
            const lastRuleEnd = lastRule?.$cstNode?.range?.end;

            let latestMatchingContextEnd: { line: number; character: number } | undefined;

            for (const r of rules) {
                const ruleType: string | undefined = r?.type;
                const ruleController: string | undefined = r?.system?.ref?.name;
                const ruleActionName: string | undefined = r?.action?.ref?.name;

                const matchesType = ruleType !== undefined && String(ruleType) === String(msg.type);
                const matchesControlAction =
                    ruleController !== undefined &&
                    ruleActionName !== undefined &&
                    msg.controlAction !== undefined &&
                    String(ruleController) === String(msg.controlAction.controller) &&
                    String(ruleActionName) === String(msg.controlAction.action);

                if (!(matchesType && matchesControlAction)) {
                    continue;
                }

                // try to find the latest context end position to add new context 
                if (Array.isArray(r.contexts)) {
                    for (const context of r.contexts) {
                        const contextEnd = context?.$cstNode?.range?.end;
                        if (!contextEnd) 
                            { 
                                continue;
                            }

                        if (
                            !latestMatchingContextEnd ||
                            contextEnd.line > latestMatchingContextEnd.line ||
                            (contextEnd.line === latestMatchingContextEnd.line &&
                                (contextEnd.character ?? 0) > latestMatchingContextEnd.character)
                        ) {
                            latestMatchingContextEnd = {
                                line: contextEnd.line,
                                character: contextEnd.character ?? 0
                            };
                        }
                    }
                }
            }

            if (latestMatchingContextEnd) {
                 // insert after that last UCA line
                insertPosition = latestMatchingContextEnd;
                insertText = generated.contextText; // only context
            } else if (lastRuleEnd) {
                // fallback: insert after last rule with complete rule text
                insertPosition = {
                    line: lastRuleEnd.line + 1,
                    character: lastRuleEnd.character ?? 0
                };
                insertText = generated.ruleText;
            } else {
                // fallback: append to end of document (assume no Context-Table rules exist)
                const docText = document.getText();
                insertPosition = document.positionAt(docText.length);
                insertPosition.line += 2;
                insertText = "Context-Table\r\n" + generated.ruleText;
            }
        } else {
            // no rules present -> append to end of file
            const docText = document.getText();
            insertPosition = document.positionAt(docText.length);
            insertPosition.line += 2;
            insertText = "Context-Table\r\n" + generated.ruleText;
        }

        await builder.assertParsesAsStpaSnippet(
            insertText.startsWith("Context-Table")
                ? insertText.replace(/^Context-Table\s*\r?\n/, "")
                : insertText
        );

        connection.sendNotification("editor/add", {
            uri: uriString,
            text: insertText,
            position: insertPosition
        });
    } catch (e) {
        console.error("insertRuleFromContextTable failed:", e);
    }
}