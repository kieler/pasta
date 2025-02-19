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
import { LanguageClient } from "vscode-languageclient/node";
import { StpaLspVscodeExtension } from "./language-extension";
import { StorageService } from "./storage-service";

// TODO: rename utils files to be more descriptive

/**
 * Creates a quickpick containing the values "true" and "false". The selected value is set for the
 * configuration option determined by {@code id}.
 * @param groupName The name of the group in which the configuration option is stored.
 * @param id The id of the configuration option that should be set.
 * @param storage The storage service to store the value for the option.
 * @param languageClient The language client to send the updated configuration to.
 */
export function createQuickPickForStorageOptions(
    groupName: string,
    id: string,
    storage: StorageService,
    languageClient: LanguageClient,
    manager: StpaLspVscodeExtension
): void {
    const quickPick = vscode.window.createQuickPick();
    quickPick.items = [{ label: "true" }, { label: "false" }];
    quickPick.onDidChangeSelection(selection => {
        let group = storage.getItem(groupName);
        if (!group) {
            group = {};
        }
        if (selection[0]?.label === "true") {
            group[id] = true;
        } else {
            group[id] = false;
        }
        storage.setItem(groupName, group);
        quickPick.hide();
        updateLanguageServerConfig(languageClient, storage, manager.clientId ?? "");
    });
    quickPick.onDidHide(() => quickPick.dispose());
    quickPick.show();
}

/**
 * Sets the value for the configuration option determined by {@code id} to the given {@code value}.
 * @param groupName The name of the group in which the configuration option is stored.
 * @param id The id of the configuration option that should be set.
 * @param value The value to set for the configuration option.
 * @param storage The storage service to store the value for the option.
 * @param languageClient The language client to send the updated configuration to.
 * @param manager The manager of the extension.
 */
export function setStorageOption(
    groupName: string,
    id: string,
    value: any,
    storage: StorageService,
    languageClient: LanguageClient,
    manager: StpaLspVscodeExtension
): void {
    let group = storage.getItem(groupName);
    if (!group) {
        group = {};
    }
    group[id] = value;
    storage.setItem(groupName, group);
    updateLanguageServerConfig(languageClient, storage, manager.clientId ?? "");
}

/**
 * Handle WorkSpaceEdit notifications form the langauge server
 * @param uri The uri of the document that should be edited.
 * @param text The text to insert.
 * @param position The position where the text should be inserted.
 */
export async function handleWorkSpaceEdit(uri: string, text: string, position: vscode.Position): Promise<void> {
    const textDocument = vscode.workspace.textDocuments.find(
        doc => doc.uri.toString() === vscode.Uri.parse(uri).toString()
    );
    if (!textDocument) {
        console.error(
            `Server requested a text edit but the requested uri was not found among the known documents: ${uri}`
        );
        return;
    }

    const edits: vscode.TextEdit[] = [vscode.TextEdit.insert(position, text)];
    await applyTextEdits(edits, uri);

    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        // count the line breaks to determine the end position
        const lineBreaks = text.match(/\n/g);
        const lines = lineBreaks ? lineBreaks.length : 1;
        const endPos = { line: position.line + lines, character: 0 } as vscode.Position;
        // select and reveal the inserted text
        activeEditor.selections = [new vscode.Selection(position, endPos)];
        activeEditor.revealRange(new vscode.Range(position, endPos));
    }

    //await textDocument.save();
    return;
}

/**
 * Applies text edits to the document.
 * @param edits The edits to apply.
 * @param uri The uri of the document that should be edited.
 */
export async function applyTextEdits(edits: vscode.TextEdit[], uri: string): Promise<void> {
    // create a workspace edit
    const workSpaceEdit = new vscode.WorkspaceEdit();
    workSpaceEdit.set(vscode.Uri.parse(uri), edits);
    // Apply the edit. Report possible failures.
    const edited = await vscode.workspace.applyEdit(workSpaceEdit);
    if (!edited) {
        console.error("Workspace edit could not be applied!");
        return;
    }
}

/**
 * Adds the {@code snippets} to the snippets in the config file.
 * @param snippets Text of snippets.
 */
export function addSnippetsToConfig(snippets: string[]): void {
    const configSnippets = vscode.workspace.getConfiguration("pasta.stpa").get("snippets");
    const newSnippets = (configSnippets as string[]).concat(snippets);
    vscode.workspace.getConfiguration("pasta.stpa").update("snippets", newSnippets);
}

/**
 * Creates a file with the given {@code uri} containing the {@code text}.
 * @param uri The uri of the file to create.
 * @param text The content of the file.
 */
export async function createFile(uri: string, text: string): Promise<void> {
    const edit = new vscode.WorkspaceEdit();
    // create the file
    edit.createFile(vscode.Uri.parse(uri), { overwrite: true });
    // insert the content
    const pos = new vscode.Position(0, 0);
    edit.insert(vscode.Uri.parse(uri), pos, text);
    // Apply the edit. Report possible failures.
    const edited = await vscode.workspace.applyEdit(edit);
    if (!edited) {
        console.error("Workspace edit could not be applied!");
        return;
    }
    // save the edit
    const doc = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === vscode.Uri.parse(uri).toString());
    const saved = await doc?.save();
    if (!saved) {
        console.error(`TextDocument ${doc?.uri} could not be saved!`);
        return;
    }
}

/**
 * Provides the different UCA types.
 */
export class UCA_TYPE {
    static NOT_PROVIDED = "not-provided";
    static PROVIDED = "provided";
    static TOO_EARLY = "too-early";
    static TOO_LATE = "too-late";
    static APPLIED_TOO_LONG = "applied-too-long";
    static STOPPED_TOO_SOON = "stopped-too-soon";
    static WRONG_TIME = "wrong-time";
    static CONTINUOUS = "continuous-problem";
    static UNDEFINED = "undefined";
}

/**
 * Creates an output channel with the given name and prints the given cut sets.
 * @param cutSets The cut sets to print.
 * @param channelName The name of the channel.
 */
export function createOutputChannel(cutSets: string[], channelName: string, minimal?: boolean): void {
    const text = cutSetsToString(cutSets, minimal);
    const outputCutSets = vscode.window.createOutputChannel(channelName);
    outputCutSets.append(text);
    outputCutSets.show();
}

/**
 * Translates the given {@code cutSets} to a string.
 * @param cutSets The cut sets to translate.
 * @param minimal Determines whether the given {@code cutSets} are minimal.
 * @returns a string that contains every cut set.
 */
export function cutSetsToString(cutSets: string[], minimal?: boolean): string {
    let text = `The resulting ${cutSets.length}`;
    if (minimal) {
        text += ` minimal`;
    }
    text += ` cut sets are:\n`;
    text += `[${cutSets.join(",\n")}]`;
    return text;
}

/**
 * Sends the updated configuration to the language server.
 * @param languageClient The language client to send the updated configuration to.
 * @param storage The storage service to get the configuration from.
 * @param clientId The client id to send the configuration to.
 */
export function updateLanguageServerConfig(
    languageClient: LanguageClient,
    storage: StorageService,
    clientId: string
): void {
    languageClient.sendNotification("config/init", { clientId: clientId, options: storage.getAllItems() });
}
