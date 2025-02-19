/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2021-2023 by
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

import { ActionMessage, JsonMap, SelectAction } from "sprotty-protocol";
import { createFileUri, createWebviewPanel } from "sprotty-vscode";
import { SprottyDiagramIdentifier } from "sprotty-vscode-protocol";
import {
    LspWebviewEndpoint,
    LspWebviewPanelManager,
    LspWebviewPanelManagerOptions,
    acceptMessageType,
} from "sprotty-vscode/lib/lsp";
import * as vscode from "vscode";
import { AddSnippetAction, GenerateSVGsAction } from "./actions";
import { ContextTablePanel } from "./context-table-panel";
import { StorageService } from "./storage-service";
import { StpaFormattingEditProvider } from "./stpa-formatter";
import {
    addSnippetsToConfig,
    applyTextEdits,
    createFile,
    handleWorkSpaceEdit,
    updateLanguageServerConfig,
} from "./utils";
import { StpaLspWebview } from "./wview";

export class StpaLspVscodeExtension extends LspWebviewPanelManager {
    // storage service for configuration options
    readonly storage: StorageService;

    protected extensionPrefix: string;

    public contextTable: ContextTablePanel;
    /** Saves the last selected UCA in the context table. */
    protected lastSelectedUCA: string[];
    clientId: string | undefined;

    protected resolveLSReady: () => void;
    readonly lsReady = new Promise<void>(resolve => (this.resolveLSReady = resolve));

    /** needed for undo/redo actions when ID enforcement is active*/
    ignoreNextTextChange: boolean = false;

    constructor(options: LspWebviewPanelManagerOptions, extensionPrefix: string, storage: StorageService) {
        super(options);
        this.extensionPrefix = extensionPrefix;
        this.storage = storage;

        // user changed configuration settings
        vscode.workspace.onDidChangeConfiguration(() => {
            // sends configuration of stpa to the language server
            updateLanguageServerConfig(this.languageClient, this.storage, this.clientId ?? "");
        });

        // add auto formatting provider
        const sel: vscode.DocumentSelector = { scheme: "file", language: "stpa" };
        vscode.languages.registerDocumentFormattingEditProvider(sel, new StpaFormattingEditProvider());

        this.addReactionsToSnippetCommands(options);
        this.addReactionsToContextTableCommands(options);

        // textdocument has changed
        vscode.workspace.onDidChangeTextDocument(changeEvent => {
            this.handleTextChangeEvent(changeEvent);
        });
        // language client sent workspace edits
        options.languageClient.onNotification("editor/workspaceedit", ({ edits, uri }) => {
            this.ignoreNextTextChange = true;
            applyTextEdits(edits, uri);
        });
        // laguage server is ready
        options.languageClient.onNotification("ready", () => {
            this.resolveLSReady();
            // open diagram
            vscode.commands.executeCommand(
                this.extensionPrefix + ".diagram.open",
                vscode.window.activeTextEditor?.document.uri
            );
            // sends configuration of stpa to the language server
            updateLanguageServerConfig(options.languageClient, this.storage, this.clientId ?? "");
        });

        // server sent svg that should be saved
        this.languageClient.onNotification("svg", ({ uri, svg }) => {
            createFile(uri, svg);
        });
    }

    /**
     * Adds reactions to the snippet commands.
     * @param options The options of the language client.
     */
    protected addReactionsToSnippetCommands(options: LspWebviewPanelManagerOptions): void {
        // handling notifications regarding the diagram snippets
        options.languageClient.onNotification(
            "editor/add",
            (msg: { uri: string; text: string; position: vscode.Position }) => {
                const pos = this.languageClient.protocol2CodeConverter.asPosition(msg.position);
                handleWorkSpaceEdit(msg.uri, msg.text, pos);
            }
        );
        options.languageClient.onNotification("config/add", (snippets: string[]) => addSnippetsToConfig(snippets));
        options.languageClient.onNotification("snippets/creationFailed", () =>
            vscode.window.showWarningMessage("Snippet could not be created.")
        );
    }

    /**
     * Adds reactions to the context table commands.
     * @param options The options of the language client.
     */
    protected addReactionsToContextTableCommands(options: LspWebviewPanelManagerOptions): void {
        options.languageClient.onNotification("contextTable/data", data => this.contextTable.setData(data));
        options.languageClient.onNotification(
            "editor/highlight",
            (msg: { startLine: number; startChar: number; endLine: number; endChar: number; uri: string }) => {
                // highlight and reveal the given range in the editor
                const editor = vscode.window.visibleTextEditors.find(
                    visibleEditor => visibleEditor.document.uri.toString() === msg.uri
                );
                if (editor) {
                    const startPosition = new vscode.Position(msg.startLine, msg.startChar);
                    const endPosition = new vscode.Position(msg.endLine, msg.endChar);
                    editor.selection = new vscode.Selection(startPosition, endPosition);
                    editor.revealRange(editor.selection, vscode.TextEditorRevealType.InCenter);
                }
            }
        );
    }

    /**
     * Notifies the language server that a textdocument has changed.
     * @param changeEvent The change in the text document.
     */
    protected handleTextChangeEvent(changeEvent: vscode.TextDocumentChangeEvent): void {
        // if the change should be ignored (e.g. for a redo/undo action), the language server is not notified.
        if (this.ignoreNextTextChange) {
            this.ignoreNextTextChange = false;
            return;
        }
        // send the changes to the language server
        const changes = changeEvent.contentChanges;
        const uri = changeEvent.document.uri.toString();
        // TODO: ID enforcer for FTA
        if (uri.endsWith(".stpa")) {
            this.languageClient.sendNotification("editor/textChange", { changes: changes, uri: uri });
        }
    }

    /**
     * Sends an AddSnippetAction to the language server containing the selected text.
     * @param commandArgs
     */
    async addSnippet(uri: vscode.Uri): Promise<void> {
        const activeEditor = vscode.window.activeTextEditor;
        const selection = activeEditor?.selection;
        const document = activeEditor?.document;
        if (document && selection) {
            if (!this.clientId) {
                const identifier = await this.createDiagramIdentifier(uri);
                this.clientId = identifier?.clientId;
            }
            const text = document
                .getText()
                .substring(document.offsetAt(selection.start), document.offsetAt(selection?.end));
            const mes: ActionMessage = {
                clientId: this.clientId!,
                action: {
                    kind: AddSnippetAction.KIND,
                    text: text,
                } as AddSnippetAction,
            };
            this.languageClient.sendNotification(acceptMessageType, mes);
        }
    }

    createContextTable(context: vscode.ExtensionContext): void {
        const extensionPath = this.options.extensionUri.fsPath;
        const tablePanel = new ContextTablePanel(
            "Context-Table",
            [createFileUri(extensionPath, "pack", "src-context-table")],
            createFileUri(extensionPath, "pack", "src-context-table", "main.js"),
            createFileUri(extensionPath, "pack", "src-context-table", "main.css")
        );
        this.contextTable = tablePanel;

        // adds listener for mouse click on a cell
        context.subscriptions.push(
            this.contextTable.cellClicked((cell: { rowId: string; columnId: string; text?: string } | undefined) => {
                if (cell?.text === "No") {
                    // delete selection in the diagram
                    this.endpoints[0].sendAction(SelectAction.create({ deselectedElementsIDs: this.lastSelectedUCA }));
                    this.lastSelectedUCA = [];
                } else if (cell?.text) {
                    const texts = cell.text.split(",");
                    // language server must determine the range of the selected uca in the editor in order to highlight it
                    // when there are multiple UCAs in the cell only the first one is highlighted in the editor
                    this.languageClient.sendNotification("contextTable/selected", texts[0]);
                    // highlight corresponding node in the diagram and maybe deselect the last selected one
                    this.endpoints[0].sendAction(
                        SelectAction.create({ selectedElementsIDs: texts, deselectedElementsIDs: this.lastSelectedUCA })
                    );
                    this.lastSelectedUCA = texts;
                }
            })
        );
    }

    // maybe not needed in next sprotty update
    // overriden to adjust the paths to the webview files
    protected createWebview(identifier: SprottyDiagramIdentifier): vscode.WebviewPanel {
        const extensionPath = this.options.extensionUri.fsPath;
        return createWebviewPanel(identifier, {
            localResourceRoots: [ createFileUri(extensionPath, 'pack', 'src-webview') ],
            scriptUri: createFileUri(extensionPath, 'pack', 'src-webview', 'main.js'),
            cssUri: createFileUri(extensionPath, 'pack', 'src-webview', 'main.css')
        });
    }

    protected override createEndpoint(identifier: SprottyDiagramIdentifier): LspWebviewEndpoint {
        const webviewContainer = this.createWebview(identifier);
        const participant = this.messenger.registerWebviewPanel(webviewContainer);
        this.clientId = identifier.clientId;
        return new StpaLspWebview(
            {
                languageClient: this.languageClient,
                webviewContainer,
                messenger: this.messenger,
                messageParticipant: participant,
                identifier,
            },
            this.storage
        );
    }

    /**
     * Triggers the creation of SVGs for the current model.
     * @param uri The folder uri where to save the SVGs.
     * @returns the widths of the resulting SVGs with the SVG name as the key.
     */
    async createSVGDiagrams(uri: string): Promise<Record<string, number>> {
        if (this.endpoints.length !== 0) {
            const activeWebview = this.endpoints[0];
            if (activeWebview?.diagramIdentifier) {
                // create GenerateSVGsAction
                const mes: ActionMessage = {
                    clientId: activeWebview.diagramIdentifier.clientId,
                    action: {
                        kind: GenerateSVGsAction.KIND,
                        options: {
                            diagramType: activeWebview.diagramIdentifier.diagramType,
                            needsClientLayout: true,
                            needsServerLayout: true,
                            sourceUri: activeWebview.diagramIdentifier.uri,
                        } as JsonMap,
                        uri: uri,
                    } as GenerateSVGsAction,
                };
                // send request
                const diagramSize: Record<string, number> = await this.languageClient.sendRequest(
                    "result/createDiagrams",
                    mes
                );
                return diagramSize;
            }
        }
        return {};
    }
}
